"""Multimodal AI Orchestrator Service for Phase 14."""

import json
import time
import uuid
from typing import AsyncIterator, List, Optional, Dict, Any, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.models.attachment import Attachment
from app.db.models.chat import Conversation, ChatMessage
from app.db.models.chat_message_attachment import ChatMessageAttachment
from app.services.ai.base import ChatMessagePayload
from app.services.ai.capabilities import get_model_capabilities
from app.services.ai.factory import get_ai_provider
from app.services.ai.mode_router import ChatMode, normalize_chat_mode, resolve_model_for_mode
from app.services.attachments.service import AttachmentService
from app.services.chat_service import (
    get_user_conversation,
    create_user_conversation,
    add_chat_message,
    compute_active_path_messages,
)
from app.services.images.ocr import MockOCRProvider, TesseractOCRProvider
from app.services.speech.service import SpeechService
from app.services.storage.service import get_storage_provider
from app.services.usage.quotas import QuotaService
from app.services.usage.service import UsageService


class MultimodalOrchestrationError(Exception):
    """Exception raised during multimodal context building or attachment validation."""

    def __init__(self, message: str, code: str = "multimodal_error", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class MultimodalAIOrchestrator:
    """
    Main Orchestrator bundling text, vision, document context, and audio transcripts
    into normalized prompt streams for AI providers.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.quota_service = QuotaService(db)
        self.usage_service = UsageService(db)

    async def _process_attachments(
        self,
        user_id: uuid.UUID,
        attachment_inputs: List[Dict[str, Any]],
        model_id: str,
        user_prompt: str,
    ) -> Tuple[List[Attachment], str]:
        """
        Validate attachment user ownership, extract context (OCR / RAG / Audio),
        and build enriched context header text.
        """
        if not attachment_inputs:
            return [], ""

        attachments: List[Attachment] = []
        context_parts: List[str] = []
        capabilities = get_model_capabilities(model_id)
        storage = get_storage_provider()

        for idx, att_in in enumerate(attachment_inputs):
            att_id = att_in.get("attachment_id")
            if not att_id:
                continue

            try:
                attachment = await AttachmentService.get_by_id(
                    db=self.db,
                    attachment_id=uuid.UUID(str(att_id)),
                    user_id=user_id,
                )
            except Exception as exc:
                raise MultimodalOrchestrationError(
                    f"Attachment {att_id} not found or access denied.",
                    code="attachment_not_found",
                    status_code=404,
                ) from exc

            if attachment.status != "ready" or attachment.deleted_at is not None:
                raise MultimodalOrchestrationError(
                    f"Attachment {att_id} is not in ready state.",
                    code="attachment_not_ready",
                    status_code=400,
                )

            attachments.append(attachment)

            # 1. Image processing
            if attachment.media_type == "image":
                if capabilities.vision:
                    context_parts.append(
                        f"[Attached Image #{idx+1}: '{attachment.original_filename}']"
                    )
                else:
                    # Non-vision model fallback -> run OCR preprocessing
                    try:
                        image_bytes = await storage.read(attachment.storage_key)
                        ocr_provider = TesseractOCRProvider() if settings.OCR_PROVIDER == "tesseract" else MockOCRProvider()
                        ocr_res = await ocr_provider.extract_text(image_bytes)
                        if ocr_res.extracted_text.strip():
                            context_parts.append(
                                f"[OCR Text Extracted from '{attachment.original_filename}']: {ocr_res.extracted_text.strip()}"
                            )
                        else:
                            context_parts.append(f"[Attached Image: '{attachment.original_filename}']")
                    except Exception:
                        context_parts.append(f"[Attached Image: '{attachment.original_filename}']")

            # 2. Document processing
            elif attachment.media_type == "document":
                try:
                    doc_bytes = await storage.read(attachment.storage_key)
                    # Attempt text extraction for small files
                    text_content = doc_bytes.decode("utf-8", errors="ignore")[:2000]
                    context_parts.append(
                        f"[Attached Document '{attachment.original_filename}' Excerpt]:\n{text_content}"
                    )
                except Exception:
                    context_parts.append(f"[Attached Document: '{attachment.original_filename}']")

            # 3. Audio processing
            elif attachment.media_type == "audio":
                try:
                    speech_service = SpeechService(self.db, storage)
                    _, tx_res = await speech_service.transcribe_attachment(
                        attachment_id=attachment.id,
                        user_id=user_id,
                    )
                    context_parts.append(
                        f"[Transcribed Audio from '{attachment.original_filename}']: {tx_res.text}"
                    )
                except Exception:
                    context_parts.append(f"[Attached Audio: '{attachment.original_filename}']")

        enriched_context = "\n\n".join(context_parts)
        return attachments, enriched_context

    async def generate_multimodal_sse_stream(
        self,
        user_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID],
        user_prompt: str,
        model_id: str,
        attachment_inputs: Optional[List[Dict[str, Any]]] = None,
        options: Optional[Dict[str, Any]] = None,
        mode: Optional[str] = "standard",
    ) -> AsyncIterator[str]:
        """
        Validate quota, assemble multimodal context, stream completion SSE frames,
        and log execution telemetry.
        """
        def format_sse(event: str, data: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(data)}\n\n"

        start_time = time.time()
        canonical_mode = normalize_chat_mode(mode)

        # 1. Check daily user quotas
        try:
            await self.quota_service.check_quota(user_id=user_id, feature_type="chat")
        except Exception as exc:
            err_msg = getattr(exc, "detail", str(exc))
            if isinstance(err_msg, dict):
                err_msg = err_msg.get("error", {}).get("message", str(err_msg))
            yield format_sse("error", {"code": "QUOTA_EXCEEDED", "message": str(err_msg)})
            return

        # 1b. Check High-mode quota if requested
        if canonical_mode == ChatMode.HIGH:
            try:
                await self.quota_service.check_high_mode_quota(user_id=user_id)
            except Exception as exc:
                err_msg = getattr(exc, "detail", str(exc))
                if isinstance(err_msg, dict):
                    err_msg = err_msg.get("error", {}).get("message", str(err_msg))
                yield format_sse("error", {"code": "HIGH_MODE_QUOTA_EXCEEDED", "message": str(err_msg)})
                return

        # Resolve effective model architecture based on chat mode
        effective_model = resolve_model_for_mode(canonical_mode)
        if model_id and model_id not in ("nexa-standard", "nexa-fast", "default", ""):
            effective_model = model_id

        # 2. Resolve or Create Conversation
        if conversation_id:
            conv = await get_user_conversation(self.db, conversation_id, user_id)
            if not conv:
                yield format_sse(
                    "error",
                    {"code": "NOT_FOUND", "message": "Conversation not found or access denied."}
                )
                return
        else:
            auto_title = user_prompt.strip()[:35] or "Multimodal Chat"
            if len(user_prompt.strip()) > 35:
                auto_title += "..."
            conv = await create_user_conversation(
                db=self.db,
                user_id=user_id,
                title=auto_title,
                model=effective_model,
            )

        # 3. Process & Enrich Attachments
        try:
            attachments, context_header = await self._process_attachments(
                user_id=user_id,
                attachment_inputs=attachment_inputs or [],
                model_id=effective_model,
                user_prompt=user_prompt,
            )
        except MultimodalOrchestrationError as exc:
            yield format_sse("error", {"code": exc.code, "message": exc.message})
            return

        # 4. Construct Final User Message Content
        final_prompt_text = user_prompt
        if context_header:
            final_prompt_text = f"{context_header}\n\nUser Question: {user_prompt}"

        # 5. Persist User ChatMessage
        user_msg = await add_chat_message(
            db=self.db,
            conversation_id=conv.id,
            parent_message_id=conv.active_leaf_message_id,
            role="user",
            content=final_prompt_text,
            model=effective_model,
            input_tokens=max(1, len(final_prompt_text) // 4),
        )
        user_msg_id = user_msg.id
        conv.active_leaf_message_id = user_msg_id
        await self.db.commit()

        # Link attachments to user message
        for idx, att in enumerate(attachments):
            link_rec = ChatMessageAttachment(
                message_id=user_msg.id,
                attachment_id=att.id,
                kind=att.media_type,
                display_order=idx,
            )
            self.db.add(link_rec)
        await self.db.commit()

        # 6. Assemble History & Stream
        history_conv = await get_user_conversation(self.db, conv.id, user_id)
        msg_history: List[ChatMessagePayload] = []
        if history_conv:
            active_msgs = compute_active_path_messages(history_conv)
            for m in active_msgs:
                msg_history.append(ChatMessagePayload(role=m["role"], content=m["content"]))

        if not msg_history:
            msg_history = [ChatMessagePayload(role="user", content=final_prompt_text)]

        assistant_msg_id = uuid.uuid4()
        yield format_sse(
            "message_start",
            {
                "conversation_id": str(conv.id),
                "message_id": str(assistant_msg_id),
                "model": effective_model,
                "mode": canonical_mode.value,
            }
        )

        provider = get_ai_provider()
        accumulated_text = ""
        input_tokens = 0
        output_tokens = 0
        stream_successful = False

        try:
            async for event in provider.stream(messages=msg_history, model=effective_model):
                if event.event == "token":
                    token_text = event.data.get("text", "")
                    accumulated_text += token_text
                    yield format_sse("token", {"text": token_text})

                elif event.event == "usage":
                    input_tokens = event.data.get("input_tokens", 0)
                    output_tokens = event.data.get("output_tokens", 0)
                    yield format_sse("usage", event.data)

                elif event.event == "error":
                    yield format_sse("error", event.data)
                    return

                elif event.event == "message_end":
                    stream_successful = True
                    yield format_sse(
                        "message_end",
                        {"message_id": str(assistant_msg_id), "finish_reason": "stop"}
                    )

        except Exception as e:
            yield format_sse(
                "error",
                {"code": "STREAMING_ERROR", "message": f"Stream execution failed: {str(e)}"}
            )
            return

        # 7. Persist Assistant ChatMessage & Telemetry
        if stream_successful and accumulated_text:
            conv_id = conv.id
            assistant_msg = ChatMessage(
                id=assistant_msg_id,
                conversation_id=conv_id,
                parent_message_id=user_msg_id,
                role="assistant",
                content=accumulated_text,
                model=effective_model,
                input_tokens=input_tokens,
                output_tokens=output_tokens or max(1, len(accumulated_text) // 4),
            )
            self.db.add(assistant_msg)
            await self.db.commit()

            conv.active_leaf_message_id = assistant_msg_id
            await self.db.commit()

            duration_ms = int((time.time() - start_time) * 1000)
            try:
                await self.usage_service.log_usage(
                    user_id=user_id,
                    feature_type="chat",
                    provider=getattr(provider, "provider_name", getattr(settings, "AI_PROVIDER", "gemini")),
                    model_name=effective_model,
                    prompt_tokens=input_tokens,
                    completion_tokens=output_tokens,
                    execution_duration_ms=duration_ms,
                    status="success",
                    mode=canonical_mode.value,
                    conversation_id=conv_id,
                    message_id=assistant_msg_id,
                )
            except Exception as exc:
                import logging
                logging.getLogger("nexaai").error(f"Failed to log usage telemetry: {exc}", exc_info=True)

# NexaAI Image Intelligence Architecture (Phase 11 & Phase 12)

This document describes the design and integration of the **Image Intelligence** module in NexaAI.

---

## 1. Executive Summary

Phase 11 extends NexaAI's multimodal foundation (Phase 10) by providing automated image analysis, computer vision operations via OpenCV/Pillow, optical character recognition (OCR), and Vision AI provider integration.
Phase 12 elevates OCR and Vision AI into **production-grade functionality** with real engine integrations (Tesseract OCR & OpenAI GPT-4o Vision), exponential backoff retries, telemetry usage logging (`AIUsageLog`), and explicit mock-mode state indicators.

The implementation builds strictly on the Phase 10 attachment infrastructure and storage abstractions.

---

## 2. Component Overview

```
apps/api/app/
├── api/v1/
│   └── images.py                # REST endpoints (/analyze, /ocr, /process, /history)
├── db/models/
│   ├── image_analysis.py        # ImageAnalysis SQLAlchemy model
│   └── usage.py                 # AIUsageLog SQLAlchemy telemetry model
├── schemas/
│   └── images.py                # Typed Pydantic request & response schemas
├── services/
│   ├── usage/
│   │   └── service.py           # Usage tracking service
│   └── images/
│       ├── __init__.py
│       ├── base.py              # Metadata definitions & custom exception types
│       ├── preprocessing.py     # Resize, rotate, crop, compress, format convert, doc enhance
│       ├── quality.py           # Blur detection (Laplacian variance), brightness, contrast
│       ├── ocr.py               # BaseOCRProvider ABC, TesseractOCRProvider & MockOCRProvider
│       ├── service.py           # ImageService main database-backed orchestrator
│       └── providers/
│           ├── __init__.py
│           ├── vision.py        # BaseVisionProvider ABC & OpenAIVisionProvider (retries & usage)
│           └── mock.py          # MockVisionProvider for offline dev/tests
└── tests/
    ├── test_images.py           # Phase 11 unit & API tests
    └── test_phase12_production_images.py # Phase 12 production provider & telemetry tests
```

---

## 3. Image Processing Operations (OpenCV & Pillow)

Server-side image operations strictly decode user images in memory using Pillow and headless OpenCV (`opencv-python-headless`).

### Supported Processing Actions:
- **Aspect Ratio Resizing**: Downscales images while preserving aspect ratio if dimensions exceed configured maximums (`MAX_IMAGE_WIDTH` / `MAX_IMAGE_HEIGHT`).
- **Rotation**: 90°, 180°, and 270° clockwise rotation.
- **Cropping**: Normalised or pixel coordinate bounding box crop.
- **Quality Compression**: JPEG/WebP compression quality factor adjustment (1–100).
- **Format Conversion**: Safe conversion between standard MIME types (`image/jpeg`, `image/png`, `image/webp`).
- **Document Image Enhancement**: Contrast stretching and adaptive thresholding for text legibility.

### Quality Analysis Metrics:
- **Blur Detection**: Calculated using the variance of the Laplacian operator on greyscale image channels:
  $$\text{Blur Score} = \operatorname{Var}\left(\nabla^2 I\right)$$
  A score below $100.0$ indicates potential motion blur or low focus.
- **Brightness**: Mean pixel luminance computed across image channels.
- **Contrast**: Standard deviation of pixel intensities across image channels.

---

## 4. Provider Abstractions & Phase 12 Enhancements

### 4.1 OCR Provider (`BaseOCRProvider`)
Defines the `extract_text(image_bytes: bytes, language: Optional[str] = None)` method.
- **`TesseractOCRProvider`**: Real local OCR provider invoking `pytesseract` / Tesseract OCR engine. Computes text blocks, confidence scores, and word bounding boxes. Gracefully falls back or raises `ProviderNotConfiguredError` if Tesseract binaries are uninstalled.
- **`MockOCRProvider`**: Used in unit tests and offline dev mode. Returns structured text blocks, bounding boxes, and confidence scores with `is_mock = True`.

### 4.2 Vision AI Provider (`BaseVisionProvider`)
Defines `describe_image`, `answer_image_question`, and `analyze_image`.
- **`OpenAIVisionProvider`**: Encodes image bytes as base64 data URLs transmitted to OpenAI `gpt-4o` vision endpoints. Enhanced in Phase 12 with:
  - Strict `VISION_TIMEOUT_SECONDS` timeouts
  - 2-stage exponential backoff for HTTP 502/503/504 transient network errors
  - Token tracking (`usage.prompt_tokens`, `usage.completion_tokens`)
  - Explicit `"provider": "openai"` and `"is_mock": false` response metadata
- **`MockVisionProvider`**: Cost-free, reliable implementation for tests and guest mode with `"provider": "mock"` and `"is_mock": true`.

---

## 5. Security & Privacy Controls

1. **Decompression Bomb Protection**:
   Explicit `PIL.Image.MAX_IMAGE_PIXELS = 25_000_000` limit enforced prior to image buffer decoding.
2. **Dimension Caps**:
   Images exceeding `MAX_IMAGE_WIDTH` x `MAX_IMAGE_HEIGHT` (4096 x 4096) are safely downscaled or rejected.
3. **No Arbitrary System Commands**:
   OpenCV operations are strictly invoked via typed Python API functions; no dynamic subprocess execution.
4. **Path Traversal & Storage Isolation**:
   Internal `storage_key` paths are kept encapsulated within backend storage services and are never rendered to clients or logs.
5. **Ownership Enforcement**:
   All image operations verify that `attachment.user_id == current_user.id`.
6. **Backend-Only Secrets**:
   `OPENAI_API_KEY` is strictly maintained within backend settings and never exposed to client bundles.

---

## 6. API Endpoint Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/images/analyze` | Request AI vision analysis or visual question answering |
| `POST` | `/api/v1/images/ocr` | Perform OCR text extraction with bounding boxes |
| `POST` | `/api/v1/images/process` | Perform crop, resize, rotate, compress, or enhancement |
| `GET` | `/api/v1/images/history` | Query user's image analysis execution history |
| `GET` | `/api/v1/images/history/{id}` | Get detailed image analysis record |
| `DELETE` | `/api/v1/images/history/{id}` | Remove image analysis record |

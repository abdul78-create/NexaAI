/**
 * Secure Conversation Sharing API Client
 */

import { useAuthStore } from "@/stores/auth-store";
import { getApiBaseUrl } from "./api-config";

const API_BASE = getApiBaseUrl();

export interface ShareResponse {
  id: string;
  conversation_id: string;
  share_token?: string | null;
  share_url?: string | null;
  is_enabled: boolean;
  expires_at?: string | null;
  revoked_at?: string | null;
  access_count: number;
  last_accessed_at?: string | null;
  created_at: string;
}

export interface SharedAttachmentMetadata {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  media_type: string;
}

export interface SharedMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  attachments: SharedAttachmentMetadata[];
}

export interface PublicShareView {
  conversation_id: string;
  title: string;
  model: string;
  created_at: string;
  messages: SharedMessageItem[];
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createShareLink(
  conversationId: string,
  expiresInDays?: number | null
): Promise<ShareResponse> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ expires_in_days: expiresInDays || null }),
  });
  if (!response.ok) {
    throw new Error("Failed to create share link");
  }
  return response.json();
}

export async function getShareStatus(conversationId: string): Promise<ShareResponse> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Share link not configured");
  }
  return response.json();
}

export async function updateShareSettings(
  conversationId: string,
  isEnabled?: boolean,
  expiresInDays?: number | null
): Promise<ShareResponse> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      is_enabled: isEnabled,
      expires_in_days: expiresInDays,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to update share link settings");
  }
  return response.json();
}

export async function revokeShareLink(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/share`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to revoke share link");
  }
}

export async function getPublicSharedView(token: string): Promise<PublicShareView> {
  const response = await fetch(`${API_BASE}/shared/${token}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (response.status === 410) {
    throw new Error("EXPIRED_OR_REVOKED");
  }
  if (!response.ok) {
    throw new Error("NOT_FOUND");
  }

  return response.json();
}

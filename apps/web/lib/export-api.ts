/**
 * Conversation Export API Client
 */

import { useAuthStore } from "@/stores/auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type ExportFormat = "markdown" | "json" | "pdf";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function downloadConversationExport(
  conversationId: string,
  format: ExportFormat
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}/export?format=${format}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to export conversation as ${format}`);
  }

  // Extract filename from Content-Disposition header if available
  const disposition = response.headers.get("content-disposition");
  let filename = `conversation_${conversationId.slice(0, 8)}.${format === "markdown" ? "md" : format}`;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

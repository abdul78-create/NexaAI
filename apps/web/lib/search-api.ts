/**
 * Global Search API Client
 */

import { useAuthStore } from "@/stores/auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface SearchResultItem {
  id: string;
  type: "conversation" | "message";
  conversation_id: string;
  title: string;
  role?: "user" | "assistant" | "system";
  snippet: string;
  match_field: "title" | "content";
  created_at: string;
  updated_at?: string;
}

export interface SearchResponse {
  query: string;
  total_conversations: number;
  total_messages: number;
  total_results: number;
  page: number;
  page_size: number;
  items: SearchResultItem[];
}

export interface SearchParams {
  q: string;
  conversation_id?: string;
  role?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchGlobal(params: SearchParams): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set("q", params.q);
  if (params.conversation_id) queryParams.set("conversation_id", params.conversation_id);
  if (params.role) queryParams.set("role", params.role);
  if (params.from_date) queryParams.set("from_date", params.from_date);
  if (params.to_date) queryParams.set("to_date", params.to_date);
  if (params.page) queryParams.set("page", params.page.toString());
  if (params.page_size) queryParams.set("page_size", params.page_size.toString());

  const response = await fetch(`${API_BASE}/search?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to execute global search query");
  }
  return response.json();
}

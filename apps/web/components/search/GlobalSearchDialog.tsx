"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, MessageSquare, FileText, Filter, Loader2 } from "lucide-react";
import { searchGlobal, SearchResultItem, SearchResponse } from "@/lib/search-api";

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "conversation" | "message">("all");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchGlobal({
          q: query.trim(),
          role: roleFilter || undefined,
          page_size: 30,
        });
        setResults(res);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, roleFilter]);

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered by parent if wired
        }
      }
      if (isOpen && e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = results?.items.filter((item) => {
    if (filterType === "conversation") return item.type === "conversation";
    if (filterType === "message") return item.type === "message";
    return true;
  }) || [];

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    router.push(`/app?c=${item.conversation_id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/80 backdrop-blur-md transition-opacity">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations, messages, titles... (Cmd+K)"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 text-base focus:outline-none"
            autoFocus
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-mono bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-700 transition"
          >
            ESC
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-md transition ${
                filterType === "all"
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              All Results {results ? `(${results.total_results})` : ""}
            </button>
            <button
              onClick={() => setFilterType("conversation")}
              className={`px-3 py-1 rounded-md transition ${
                filterType === "conversation"
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Conversations {results ? `(${results.total_conversations})` : ""}
            </button>
            <button
              onClick={() => setFilterType("message")}
              className={`px-3 py-1 rounded-md transition ${
                filterType === "message"
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              Messages {results ? `(${results.total_messages})` : ""}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="user">User Messages</option>
              <option value="assistant">Assistant Responses</option>
            </select>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!query.trim() && (
            <div className="p-8 text-center text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-700 stroke-1" />
              <p className="text-sm font-medium">Type a term to search across all your conversations</p>
              <p className="text-xs text-slate-600 mt-1">
                Filter by conversation title, prompt content, or AI responses
              </p>
            </div>
          )}

          {query.trim() && !loading && filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-700 stroke-1" />
              <p className="text-sm font-medium">No results found matching &quot;{query}&quot;</p>
              <p className="text-xs text-slate-600 mt-1">Try refining your query or resetting role filters</p>
            </div>
          )}

          {filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`group p-3 rounded-xl cursor-pointer transition border ${
                  isSelected
                    ? "bg-indigo-950/40 border-indigo-500/40"
                    : "bg-slate-900/40 border-transparent hover:bg-slate-850 hover:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === "conversation" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        <MessageSquare className="w-3 h-3" /> Conversation
                      </span>
                    ) : (
                      <span
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${
                          item.role === "user"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}
                      >
                        <FileText className="w-3 h-3" /> {item.role?.toUpperCase() || "MESSAGE"}
                      </span>
                    )}
                    <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-indigo-300">
                      {item.title}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 pl-1 border-l-2 border-slate-700 group-hover:border-indigo-500/60 transition">
                  {item.snippet}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>Use ↑↓ to navigate</span>
            <span>Enter to select</span>
            <span>Esc to close</span>
          </div>
          <span>Scoped to your account</span>
        </div>
      </div>
    </div>
  );
};

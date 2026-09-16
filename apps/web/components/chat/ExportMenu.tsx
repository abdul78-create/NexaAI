"use client";

import React, { useState } from "react";
import { Download, FileText, Code, FileCode, Loader2, Check } from "lucide-react";
import { downloadConversationExport, ExportFormat } from "@/lib/export-api";

interface ExportMenuProps {
  conversationId: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ conversationId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [successFormat, setSuccessFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);
    try {
      await downloadConversationExport(conversationId, format);
      setSuccessFormat(format);
      setTimeout(() => setSuccessFormat(null), 2000);
    } catch (err) {
      console.error(`Failed to export ${format}:`, err);
      alert(`Failed to export conversation as ${format.toUpperCase()}`);
    } finally {
      setExportingFormat(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Export Conversation"
        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 text-xs font-medium border border-slate-800"
      >
        <Download className="w-4 h-4 text-indigo-400" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-40 p-1.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Export Format
            </div>

            <button
              onClick={() => handleExport("markdown")}
              disabled={!!exportingFormat}
              className="w-full text-left px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center justify-between transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Markdown (.md)</span>
              </div>
              {exportingFormat === "markdown" ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              ) : successFormat === "markdown" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : null}
            </button>

            <button
              onClick={() => handleExport("json")}
              disabled={!!exportingFormat}
              className="w-full text-left px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center justify-between transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                <span>JSON (.json)</span>
              </div>
              {exportingFormat === "json" ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              ) : successFormat === "json" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : null}
            </button>

            <button
              onClick={() => handleExport("pdf")}
              disabled={!!exportingFormat}
              className="w-full text-left px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center justify-between transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-rose-400" />
                <span>PDF Document (.pdf)</span>
              </div>
              {exportingFormat === "pdf" ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              ) : successFormat === "pdf" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : null}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

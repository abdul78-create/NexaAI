"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Share2,
  Lock,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  User,
  Bot,
  ExternalLink,
} from "lucide-react";
import { getPublicSharedView, PublicShareView } from "@/lib/share-api";

export default function SharedConversationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [shareView, setShareView] = useState<PublicShareView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<"EXPIRED_OR_REVOKED" | "NOT_FOUND" | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    getPublicSharedView(token)
      .then((data) => {
        setShareView(data);
      })
      .catch((err) => {
        if (err.message === "EXPIRED_OR_REVOKED") {
          setErrorReason("EXPIRED_OR_REVOKED");
        } else {
          setErrorReason("NOT_FOUND");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <Sparkles className="size-6 text-indigo-400 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-300">Loading shared conversation...</p>
      </div>
    );
  }

  if (errorReason || !shareView) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-4">
          <div className="size-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {errorReason === "EXPIRED_OR_REVOKED"
              ? "Share Link Expired or Revoked"
              : "Shared Conversation Not Found"}
          </h2>
          <p className="text-sm text-slate-400">
            {errorReason === "EXPIRED_OR_REVOKED"
              ? "The owner has disabled, revoked, or set an expiration limit on this share link."
              : "This public link is invalid or no longer exists."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              <Sparkles className="size-4" />
              <span>Explore NexaAI Assistant</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md group-hover:opacity-90 transition">
              <Sparkles className="size-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              Nexa<span className="text-indigo-400">AI</span>
            </span>
          </Link>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-medium">
            <Share2 className="size-3" />
            <span>Shared Public View</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Read-Only</span>
          </div>
          <Link
            href="/"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition"
          >
            Try NexaAI
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Title & Metadata Banner */}
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <h1 className="text-2xl font-bold text-slate-100">{shareView.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-indigo-400" />
              <span>Created {new Date(shareView.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-indigo-400" />
              <span>Model: {shareView.model}</span>
            </div>
          </div>
        </div>

        {/* Chat Bubbles */}
        <div className="space-y-6">
          {shareView.messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-4 p-5 rounded-2xl border transition ${
                  isUser
                    ? "bg-slate-900/40 border-slate-800/80"
                    : "bg-indigo-950/20 border-indigo-500/20"
                }`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                    isUser ? "bg-slate-800 border border-slate-700" : "bg-indigo-600"
                  }`}
                >
                  {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold capitalize text-slate-300">{msg.role}</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Attachment Cards */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                        >
                          <FileText className="size-3.5 text-indigo-400" />
                          <span className="font-medium truncate max-w-[160px]">
                            {att.original_filename}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({(att.size_bytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        <p>This is a read-only shared conversation generated via NexaAI.</p>
        <p className="mt-1">
          Owner credentials and private settings are protected.
        </p>
      </footer>
    </div>
  );
}

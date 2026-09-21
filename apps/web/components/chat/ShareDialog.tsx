"use client";

import React, { useEffect, useState } from "react";
import {
  Share2,
  X,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  Power,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  createShareLink,
  getShareStatus,
  updateShareSettings,
  revokeShareLink,
  ShareResponse,
} from "@/lib/share-api";

interface ShareDialogProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ conversationId, isOpen, onClose }) => {
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [actionLoading, setActionLoading] = useState(false);

  // Load share status on open
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    setLoading(true);
    getShareStatus(conversationId)
      .then((data) => {
        setShareData(data);
      })
      .catch(() => {
        setShareData(null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, conversationId]);

  if (!isOpen) return null;

  const getFullShareUrl = (token?: string | null) => {
    if (!token) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/shared/${token}`;
  };

  const handleCreateShare = async () => {
    setActionLoading(true);
    try {
      const data = await createShareLink(conversationId, expiresInDays);
      setShareData(data);
    } catch (err) {
      console.error("Create share failed:", err);
      alert("Failed to generate share link");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setActionLoading(true);
    try {
      const data = await updateShareSettings(conversationId, enabled, expiresInDays);
      setShareData(data);
    } catch (err) {
      console.error("Update share failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this share link? Anyone with the link will immediately lose access.")) {
      return;
    }
    setActionLoading(true);
    try {
      await revokeShareLink(conversationId);
      setShareData(null);
    } catch (err) {
      console.error("Revoke failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareData?.share_token) return;
    const url = getFullShareUrl(shareData.share_token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Share Conversation</h3>
              <p className="text-xs text-slate-400">Generate a secure, read-only public web link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Privacy Alert */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Privacy Notice:</span> Anyone with the link can view this conversation until it is revoked or expired. Your email, user profile, and private credentials are never shared.
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Loading share configuration...</span>
            </div>
          ) : !shareData || !shareData.is_enabled ? (
            /* Create Share Section */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Link Expiration Duration
                </label>
                <select
                  value={expiresInDays === null ? "never" : expiresInDays}
                  onChange={(e) =>
                    setExpiresInDays(e.target.value === "never" ? null : Number(e.target.value))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 Day</option>
                  <option value={7}>7 Days (Recommended)</option>
                  <option value={30}>30 Days</option>
                  <option value="never">Never Expire</option>
                </select>
              </div>

              <button
                onClick={handleCreateShare}
                disabled={actionLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>Generate Public Share Link</span>
              </button>
            </div>
          ) : (
            /* Active Share Management */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Public Share Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullShareUrl(shareData.share_token)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              {/* Status Metadata */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Views:</span>
                  <span className="font-semibold text-slate-200">{shareData.access_count} views</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className="font-semibold text-slate-200">
                    {shareData.expires_at
                      ? new Date(shareData.expires_at).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleToggleEnabled(false)}
                  disabled={actionLoading}
                  className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <Power className="w-3.5 h-3.5" /> Disable Access
                </button>

                <button
                  onClick={handleRevoke}
                  disabled={actionLoading}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Revoke Share Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

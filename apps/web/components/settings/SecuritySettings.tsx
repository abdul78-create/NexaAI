'use client'

import React from 'react'
import { KeyRound, ShieldAlert, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

export const SecuritySettings: React.FC = () => {
  const { logout } = useAuthStore()

  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <KeyRound className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-slate-100">Security & Authentication</h3>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> JWT Refresh Token Rotation
          </h4>
          <p className="text-slate-400 leading-relaxed">
            Your active session uses short-lived JWT access tokens paired with rotating HttpOnly refresh tokens. Signing out immediately revokes your active refresh token across all devices.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-200">Active Session Management</h4>
            <p className="text-slate-400">Sign out of your account on this browser session.</p>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

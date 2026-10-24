'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  // Strict 3.5-second auto-dismiss with clearTimeout cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 flex items-start gap-3 ${
        isSuccess
          ? 'bg-slate-900/95 text-emerald-100 border-emerald-500/50'
          : isError
          ? 'bg-slate-900/95 text-rose-100 border-rose-500/50'
          : isWarning
          ? 'bg-slate-900/95 text-amber-100 border-amber-500/50'
          : 'bg-slate-900/95 text-teal-100 border-teal-500/50'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
        {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
        {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-teal-400" />}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 opacity-90">
            {toast.title}
          </div>
        )}
        <div className="text-xs sm:text-sm font-medium leading-relaxed text-slate-100">
          {toast.message}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

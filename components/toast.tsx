'use client';

import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full sm:w-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-2xl shadow-lg border animate-in fade-in slide-in-from-bottom-4 duration-300
            ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-100 text-red-800'
                : toast.type === 'success'
                ? 'bg-green-50 border-green-100 text-green-800'
                : 'bg-white border-slate-200 text-slate-800'
            }
          `}
        >
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />}
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-green-500" />}
          {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 text-blue-500" />}

          <p className="text-sm font-medium leading-tight flex-1">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

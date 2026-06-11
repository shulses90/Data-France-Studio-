'use client';

import { useSyncExternalStore } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toasts]));
};

export const toast = {
  show: (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };
    toasts = [...toasts, newToast];
    notifyListeners();

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }, 5000);
  },
  error: (message: string) => toast.show(message, 'error'),
  success: (message: string) => toast.show(message, 'success'),
};

export function useToast() {
  return useSyncExternalStore(
    (callback) => {
      toastListeners.push(callback);
      return () => {
        toastListeners = toastListeners.filter((l) => l !== callback);
      };
    },
    () => toasts,
    () => [] // Server snapshot
  );
}

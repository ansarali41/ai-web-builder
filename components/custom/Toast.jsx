"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';

let toastQueue = [];
let listeners = [];

export function showToast({ title, message, type = 'error', duration = 6000 }) {
    const id = Date.now() + Math.random();
    const toast = { id, title, message, type, duration };
    toastQueue = [...toastQueue, toast];
    listeners.forEach(fn => fn(toastQueue));
    setTimeout(() => {
        toastQueue = toastQueue.filter(t => t.id !== id);
        listeners.forEach(fn => fn(toastQueue));
    }, duration);
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        listeners.push(setToasts);
        return () => {
            listeners = listeners.filter(l => l !== setToasts);
        };
    }, []);

    const dismiss = (id) => {
        toastQueue = toastQueue.filter(t => t.id !== id);
        listeners.forEach(fn => fn(toastQueue));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => {
                const Icon = toast.type === 'rate-limit' ? Clock : AlertTriangle;
                const accent = toast.type === 'rate-limit'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-red-500/30 bg-red-500/10';
                const iconColor = toast.type === 'rate-limit' ? 'text-amber-400' : 'text-red-400';
                return (
                    <div
                        key={toast.id}
                        className={`relative flex items-start gap-3 rounded-xl border ${accent} backdrop-blur-md p-4 pr-9 shadow-2xl animate-in slide-in-from-right`}
                    >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor} mt-0.5`} />
                        <div className="flex-1 min-w-0">
                            {toast.title && (
                                <p className="text-sm font-semibold text-white">{toast.title}</p>
                            )}
                            <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="absolute top-2 right-2 p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

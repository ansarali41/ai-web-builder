"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Trash2, MessageSquare } from 'lucide-react';
import { getHistory, removeFromHistory, clearHistory } from '@/lib/chatHistory';

function formatTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
}

export default function ChatHistory() {
    const [items, setItems] = useState([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const refresh = () => setItems(getHistory());
        refresh();
        window.addEventListener('aiwb:history-changed', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener('aiwb:history-changed', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    if (!mounted || items.length === 0) return null;

    return (
        <div className="mt-16 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-widest text-neutral-600 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Recent
                </p>
                <button
                    onClick={() => {
                        if (confirm('Clear all chat history?')) clearHistory();
                    }}
                    className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors"
                >
                    Clear all
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="group relative rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] transition-all duration-200"
                    >
                        <Link
                            href={`/workspace/${item.id}`}
                            className="flex items-start gap-3 p-3 pr-10"
                        >
                            <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-md bg-white/[0.04]">
                                <MessageSquare className="h-3.5 w-3.5 text-neutral-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-neutral-200 truncate">{item.title}</p>
                                <p className="text-[11px] text-neutral-600 mt-0.5">{formatTime(item.updatedAt)}</p>
                            </div>
                        </Link>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeFromHistory(item.id);
                            }}
                            className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-md text-neutral-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from history"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

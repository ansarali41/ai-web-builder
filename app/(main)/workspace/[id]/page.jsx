"use client";

import dynamic from 'next/dynamic';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { addToHistory } from '@/lib/chatHistory';

const ChatView = dynamic(() => import('@/components/custom/ChatView'), {
    ssr: false,
    loading: () => (
        <div className="h-full rounded-xl bg-[#0a0a0a] border border-white/[0.06] flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-neutral-500 animate-spin" />
        </div>
    )
});

const CodeView = dynamic(() => import('@/components/custom/CodeView'), {
    ssr: false,
    loading: () => (
        <div className="h-full rounded-xl bg-[#0a0a0a] border border-white/[0.06] flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-neutral-500 animate-spin" />
        </div>
    )
});

const Workspace = () => {
    const { id } = useParams();
    const convex = useConvex();

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        (async () => {
            try {
                const ws = await convex.query(api.workspace.GetWorkspace, { workspaceId: id });
                if (cancelled || !ws) return;
                const firstUserMsg = (ws.messages || []).find(m => m?.role === 'user');
                const title = firstUserMsg?.content || 'Untitled chat';
                addToHistory(id, title);
            } catch (e) {
                console.error('Failed to load workspace for history:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [id, convex]);

    return (
        <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white">
            {/* Subtle dot grid */}
            <div className="pointer-events-none fixed inset-0 z-0 [background-image:radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative z-10 h-full pt-16 pb-3 px-3 flex flex-col">
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-4 xl:col-span-3 min-h-0 overflow-hidden">
                        <ChatView />
                    </div>
                    <div className="lg:col-span-8 xl:col-span-9 min-h-0 overflow-hidden">
                        <CodeView />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;

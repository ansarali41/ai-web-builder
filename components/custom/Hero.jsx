"use client"
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import { ArrowUp, Wand2, Loader2 } from 'lucide-react';
import React, { useContext, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import ChatHistory from './ChatHistory';
import { addToHistory } from '@/lib/chatHistory';
import { showToast } from './Toast';

function Hero() {
    const [userInput, setUserInput] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const { setMessages } = useContext(MessagesContext);
    const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
    const router = useRouter();

    const onGenerate = async (input) => {
        if (!input?.trim()) return;
        const msg = { role: 'user', content: input };
        setMessages(msg);
        const workspaceID = await CreateWorkspace({ messages: [msg] });
        addToHistory(workspaceID, input);
        router.push('/workspace/' + workspaceID);
    };

    const enhancePrompt = async () => {
        if (!userInput) return;
        setIsEnhancing(true);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userInput }),
            });

            if (!response.ok) {
                const errText = await response.text();
                let errData = null;
                try { errData = JSON.parse(errText); } catch {}
                if (response.status === 429 || errData?.isRateLimit) {
                    showToast({
                        type: 'rate-limit',
                        title: 'AI usage limit reached',
                        message: errData?.error || 'Please wait a few minutes and try again.',
                        duration: 8000,
                    });
                } else {
                    showToast({
                        type: 'error',
                        title: 'Enhance failed',
                        message: errData?.error || `Server returned ${response.status}.`,
                    });
                }
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let enhancedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk) {
                                enhancedText += data.chunk;
                                setUserInput(enhancedText);
                            }
                            if (data.done && data.enhancedPrompt) {
                                setUserInput(data.enhancedPrompt);
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (error) {
            console.error('Error enhancing prompt:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onGenerate(userInput);
        }
    };

    return (
        <div className="min-h-screen relative bg-[#0a0a0a] text-white">
            {/* Subtle dot grid background */}
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,#0a0a0a_70%)]" />

            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-24">
                {/* Heading */}
                <div className="w-full max-w-2xl text-center mb-10">
                    <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight font-display mb-5 leading-[1.05]">
                        What do you want to build?
                    </h1>
                    <p className="text-base text-neutral-400">
                        Describe your idea. We'll generate the React + Tailwind code in seconds.
                    </p>
                </div>

                {/* Prompt input */}
                <div className="w-full max-w-2xl">
                    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] focus-within:border-white/25 transition-colors duration-200">
                        <textarea
                            placeholder="A modern SaaS landing page with hero, features, and pricing..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isEnhancing}
                            className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none text-[15px] leading-relaxed resize-none px-5 pt-5 pb-2 h-32"
                        />

                        <div className="flex items-center justify-between px-4 pb-3">
                            <button
                                onClick={enhancePrompt}
                                disabled={!userInput || isEnhancing}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-neutral-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                                title="Enhance prompt"
                            >
                                {isEnhancing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Wand2 className="h-3.5 w-3.5" />
                                )}
                                <span>Enhance</span>
                            </button>

                            <button
                                onClick={() => onGenerate(userInput)}
                                disabled={!userInput || isEnhancing}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:bg-white/10 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
                                aria-label="Generate"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Hint */}
                    <div className="mt-3 text-center text-xs text-neutral-600">
                        Press <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] text-neutral-400 font-mono text-[10px]">Enter</kbd> to generate · <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] text-neutral-400 font-mono text-[10px]">Shift+Enter</kbd> for new line
                    </div>
                </div>

                {/* Quick templates */}
                <div className="mt-12 w-full max-w-3xl">
                    <p className="text-center text-xs uppercase tracking-widest text-neutral-600 mb-4">
                        Or try
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {Lookup?.SUGGSTIONS?.slice(0, 8).map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => setUserInput(suggestion)}
                                className="rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-neutral-400 hover:border-white/25 hover:text-white hover:bg-white/[0.05] transition-all duration-200"
                            >
                                {suggestion.length > 60 ? suggestion.slice(0, 60) + '…' : suggestion}
                            </button>
                        ))}
                    </div>
                </div>

                <ChatHistory />
            </div>
        </div>
    );
}

export default Hero;

"use client"
import { MessagesContext } from '@/context/MessagesContext';
import {
    Loader2, ArrowUp, Bot,
    FileCode, Palette, Layout, CheckCircle2,
    Code2, Eye, Layers
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useConvex } from 'convex/react';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, memo, useRef } from 'react';
import { useMutation } from 'convex/react';
import Prompt from '@/data/Prompt';
import ReactMarkdown from 'react-markdown';
import { showToast } from './Toast';

const ACTIVITY_TYPES = {
    analyzing: { icon: Eye, label: 'Analyzing request' },
    planning: { icon: Layout, label: 'Planning structure' },
    generating: { icon: Code2, label: 'Generating code' },
    styling: { icon: Palette, label: 'Applying styles' },
    components: { icon: Layers, label: 'Building components' },
    finalizing: { icon: FileCode, label: 'Finalizing files' },
    complete: { icon: CheckCircle2, label: 'Complete' },
};

const ActivityItem = memo(({ type, isActive }) => {
    const activity = ACTIVITY_TYPES[type];
    if (!activity) return null;
    return (
        <div className="flex items-center gap-2.5 py-1.5">
            <activity.icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-white' : type === 'complete' ? 'text-emerald-400' : 'text-neutral-600'}`} />
            <span className={`text-xs ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                {activity.label}
            </span>
            {isActive && (
                <span className="ml-auto flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
            )}
        </div>
    );
});
ActivityItem.displayName = 'ActivityItem';

const MessageItem = memo(({ msg }) => {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
                    isUser
                        ? 'bg-white text-black rounded-br-sm'
                        : 'bg-white/[0.04] text-neutral-200 border border-white/[0.06] rounded-bl-sm'
                }`}
            >
                <ReactMarkdown
                    className={`prose prose-sm max-w-none ${
                        isUser
                            ? 'prose-p:text-black prose-strong:text-black prose-headings:text-black prose-code:text-black'
                            : 'prose-invert prose-p:text-neutral-200 prose-headings:text-white prose-code:text-neutral-200 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs'
                    }`}
                >
                    {msg.content}
                </ReactMarkdown>
            </div>
        </div>
    );
});
MessageItem.displayName = 'MessageItem';

function ChatView() {
    const { id } = useParams();
    const convex = useConvex();
    const { messages, setMessages } = useContext(MessagesContext);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentActivity, setCurrentActivity] = useState(null);
    const [activityHistory, setActivityHistory] = useState([]);
    const UpdateMessages = useMutation(api.workspace.UpdateWorkspace);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const simulateActivityProgress = useCallback(() => {
        const activities = ['analyzing', 'planning', 'components', 'styling', 'generating', 'finalizing'];
        let index = 0;
        setActivityHistory([]);
        setCurrentActivity(activities[0]);
        const interval = setInterval(() => {
            if (index < activities.length - 1) {
                setActivityHistory(prev => [...prev, { type: activities[index] }]);
                index++;
                setCurrentActivity(activities[index]);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const GetWorkSpaceData = useCallback(async () => {
        const result = await convex.query(api.workspace.GetWorkspace, { workspaceId: id });
        setMessages(result?.messages);
    }, [id, convex, setMessages]);

    useEffect(() => {
        id && GetWorkSpaceData();
    }, [id, GetWorkSpaceData]);

    const GetAiResponse = useCallback(async () => {
        setLoading(true);
        const clearProgress = simulateActivityProgress();
        const PROMPT = JSON.stringify(messages) + Prompt.CHAT_PROMPT;

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: PROMPT }),
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
                        title: 'Chat failed',
                        message: errData?.error || `Server returned ${response.status}.`,
                    });
                }
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            const aiMessageIndex = messages.length;
            setMessages(prev => [...prev, { role: 'ai', content: '' }]);

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
                                fullText += data.chunk;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    updated[aiMessageIndex] = { role: 'ai', content: fullText };
                                    return updated;
                                });
                            }
                            if (data.done && data.result) {
                                fullText = data.result;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    updated[aiMessageIndex] = { role: 'ai', content: fullText };
                                    return updated;
                                });
                            }
                        } catch (e) {}
                    }
                }
            }

            const finalMessages = [...messages, { role: 'ai', content: fullText }];
            await UpdateMessages({ messages: finalMessages, workspaceId: id });
            setActivityHistory(prev => [...prev, { type: 'complete' }]);
            setCurrentActivity('complete');
        } catch (error) {
            console.error('Error getting AI response:', error);
        } finally {
            clearProgress();
            setLoading(false);
            setTimeout(() => {
                setCurrentActivity(null);
                setActivityHistory([]);
            }, 1500);
        }
    }, [messages, id, UpdateMessages, setMessages, simulateActivityProgress]);

    useEffect(() => {
        if (messages?.length > 0) {
            const role = messages[messages?.length - 1].role;
            if (role === 'user') {
                GetAiResponse();
            }
        }
    }, [messages, GetAiResponse]);

    const onGenerate = useCallback((input) => {
        setMessages(prev => [...prev, { role: 'user', content: input }]);
        setUserInput('');
    }, [setMessages]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && userInput.trim()) {
            e.preventDefault();
            onGenerate(userInput);
        }
    };

    return (
        <div className="h-full flex flex-col rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Bot className="h-4 w-4 text-neutral-300" />
                    </div>
                    <h3 className="text-sm font-medium text-white">AI Agent</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span>{loading ? 'Working' : 'Ready'}</span>
                </div>
            </div>

            {/* Activity Panel */}
            {(loading || currentActivity) && (
                <div className="px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                        {activityHistory.map((activity, idx) => (
                            <ActivityItem key={idx} type={activity.type} isActive={false} />
                        ))}
                        {currentActivity && currentActivity !== 'complete' && (
                            <ActivityItem type={currentActivity} isActive={true} />
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
                {Array.isArray(messages) && messages?.map((msg, index) => (
                    <MessageItem key={index} msg={msg} />
                ))}

                {loading && !messages?.some(m => m.role === 'ai' && m.content === '') && (
                    <div className="flex justify-start">
                        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-3.5 py-3">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-white/[0.06]">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] focus-within:border-white/25 transition-colors">
                    <textarea
                        placeholder="Describe a change..."
                        value={userInput}
                        onChange={(event) => setUserInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="w-full bg-transparent text-white placeholder-neutral-600 focus:outline-none text-[13.5px] leading-relaxed resize-none px-3.5 pt-3 pb-1 max-h-32"
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                        }}
                    />
                    <div className="flex items-center justify-end px-2.5 pb-2">
                        <button
                            onClick={() => userInput.trim() && onGenerate(userInput)}
                            disabled={!userInput.trim() || loading}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white text-black hover:bg-neutral-200 disabled:bg-white/10 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send"
                        >
                            <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatView;

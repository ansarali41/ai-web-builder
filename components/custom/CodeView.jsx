'use client';
import React, { useContext, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Lookup from '@/data/Lookup';
import { MessagesContext } from '@/context/MessagesContext';
import Prompt from '@/data/Prompt';
import { useConvex, useMutation } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { Loader2Icon, Download, Code2, Eye, Sparkles, FileCode, CheckCircle2, Folder, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import { showToast } from './Toast';

const SandpackProvider = dynamic(() => import('@codesandbox/sandpack-react').then(mod => mod.SandpackProvider), { ssr: false });
const SandpackLayout = dynamic(() => import('@codesandbox/sandpack-react').then(mod => mod.SandpackLayout), { ssr: false });
const SandpackCodeEditor = dynamic(() => import('@codesandbox/sandpack-react').then(mod => mod.SandpackCodeEditor), { ssr: false });
const SandpackPreview = dynamic(() => import('@codesandbox/sandpack-react').then(mod => mod.SandpackPreview), { ssr: false });
const SandpackFileExplorer = dynamic(() => import('@codesandbox/sandpack-react').then(mod => mod.SandpackFileExplorer), { ssr: false });

function CodeView() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('code');
    const [files, setFiles] = useState(Lookup?.DEFAULT_FILE);
    const { messages } = useContext(MessagesContext);
    const UpdateFiles = useMutation(api.workspace.UpdateFiles);
    const convex = useConvex();
    const [loading, setLoading] = useState(false);
    const [sandpackKey, setSandpackKey] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [fileCount, setFileCount] = useState(0);

    const preprocessFiles = useCallback(files => {
        const processed = {};
        Object.entries(files).forEach(([path, content]) => {
            if (typeof content === 'string') {
                processed[path] = { code: content };
            } else if (content && typeof content === 'object') {
                if (!content.code && typeof content === 'object') {
                    processed[path] = { code: JSON.stringify(content, null, 2) };
                } else {
                    processed[path] = content;
                }
            }
        });
        return processed;
    }, []);

    const GetFiles = useCallback(async () => {
        const result = await convex.query(api.workspace.GetWorkspace, {
            workspaceId: id,
        });
        const processedFiles = preprocessFiles(result?.fileData || {});
        const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedFiles };
        setFiles(mergedFiles);
        setFileCount(Object.keys(mergedFiles).length);
        setSandpackKey(prev => prev + 1);
        setIsReady(true);
    }, [id, convex, preprocessFiles]);

    useEffect(() => {
        if (id) {
            setIsReady(false);
            GetFiles();
        }
    }, [id, GetFiles]);

    const GenerateAiCode = useCallback(async () => {
        setLoading(true);
        const PROMPT = JSON.stringify(messages) + ' ' + Prompt.CODE_GEN_PROMPT;

        try {
            const response = await fetch('/api/gen-ai-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: PROMPT }),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[GenerateAiCode] HTTP error:', response.status, errText);
                let errData = null;
                try { errData = JSON.parse(errText); } catch {}
                if (response.status === 429 || errData?.isRateLimit) {
                    showToast({
                        type: 'rate-limit',
                        title: 'AI usage limit reached',
                        message: errData?.error || "You've hit the AI rate limit. Please wait a few minutes and try again.",
                        duration: 8000,
                    });
                } else {
                    showToast({
                        type: 'error',
                        title: 'Code generation failed',
                        message: errData?.error || `Server returned ${response.status}. Check console for details.`,
                    });
                }
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let finalData = null;
            let serverError = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.error) {
                                serverError = data.error;
                                console.error('[GenerateAiCode] Server error:', data.error);
                                if (data.raw) console.error('[GenerateAiCode] Raw response:', data.raw);
                            }
                            if (data.done && data.final) {
                                finalData = data.final;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (serverError && !finalData) {
                showToast({
                    type: 'error',
                    title: 'Code generation failed',
                    message: serverError,
                });
                return;
            }

            if (finalData && finalData.files) {
                const processedAiFiles = preprocessFiles(finalData.files || {});
                const mergedFiles = { ...Lookup.DEFAULT_FILE, ...processedAiFiles };
                setFiles(mergedFiles);
                setFileCount(Object.keys(mergedFiles).length);
                setSandpackKey(prev => prev + 1);

                await UpdateFiles({
                    workspaceId: id,
                    files: finalData.files,
                });
            }
        } catch (error) {
            console.error('Error generating AI code:', error);
        } finally {
            setLoading(false);
        }
    }, [messages, id, UpdateFiles, preprocessFiles]);

    useEffect(() => {
        if (messages?.length > 0) {
            const role = messages[messages?.length - 1].role;
            if (role === 'user') {
                GenerateAiCode();
            }
        }
    }, [messages, GenerateAiCode]);

    const downloadFiles = useCallback(async () => {
        try {
            const zip = new JSZip();

            Object.entries(files).forEach(([filename, content]) => {
                let fileContent;
                if (typeof content === 'string') {
                    fileContent = content;
                } else if (content && typeof content === 'object') {
                    if (content.code) {
                        fileContent = content.code;
                    } else {
                        fileContent = JSON.stringify(content, null, 2);
                    }
                }

                if (fileContent) {
                    const cleanFileName = filename.startsWith('/') ? filename.slice(1) : filename;
                    zip.file(cleanFileName, fileContent);
                }
            });

            const packageJson = {
                name: 'generated-project',
                version: '1.0.0',
                private: true,
                dependencies: Lookup.DEPENDANCY,
                scripts: {
                    dev: 'vite',
                    build: 'vite build',
                    preview: 'vite preview',
                },
            };
            zip.file('package.json', JSON.stringify(packageJson, null, 2));

            const blob = await zip.generateAsync({ type: 'blob' });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'project-files.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading files:', error);
        }
    }, [files]);

    const tabs = [
        { id: 'code', label: 'Editor', icon: Code2 },
        { id: 'preview', label: 'Preview', icon: Eye },
    ];

    return (
        <div className="h-full flex flex-col rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
                {/* Left: Tabs */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                activeTab === tab.id ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Center: File info */}
                <div className="hidden md:flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        <Folder className="h-3 w-3" />
                        <span>{fileCount} files</span>
                    </div>
                    {isReady && !loading && (
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Ready</span>
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setSandpackKey(prev => prev + 1)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                        title="Refresh preview"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={downloadFiles}
                        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-neutral-300 hover:text-white transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Editor/Preview Area */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
                {isReady && (
                    <SandpackProvider
                        key={sandpackKey}
                        files={files}
                        template="react"
                        theme="dark"
                        customSetup={{
                            dependencies: {
                                ...Lookup.DEPENDANCY,
                            },
                            entry: '/index.js',
                        }}
                        options={{
                            externalResources: ['https://cdn.tailwindcss.com'],
                            bundlerTimeoutSecs: 120,
                            recompileMode: 'immediate',
                            recompileDelay: 300,
                        }}
                    >
                        <SandpackLayout className="!bg-transparent !border-none !rounded-none h-full">
                            {activeTab === 'code' ? (
                                <>
                                    <SandpackFileExplorer
                                        style={{
                                            height: '100%',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
                                            backgroundColor: 'rgba(10, 10, 15, 0.8)',
                                            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                            flexShrink: 0,
                                            minWidth: '180px',
                                            maxWidth: '220px',
                                        }}
                                    />
                                    <SandpackCodeEditor
                                        style={{
                                            height: '100%',
                                            overflow: 'hidden',
                                            backgroundColor: 'rgba(10, 10, 15, 0.5)',
                                            flex: 1,
                                        }}
                                        showTabs
                                        showLineNumbers
                                        showInlineErrors
                                        wrapContent={false}
                                        readOnly={loading}
                                    />
                                </>
                            ) : (
                                <SandpackPreview
                                    style={{
                                        height: '100%',
                                        backgroundColor: '#ffffff',
                                    }}
                                    showNavigator={true}
                                    showOpenInCodeSandbox={false}
                                    showRefreshButton={true}
                                />
                            )}
                        </SandpackLayout>
                    </SandpackProvider>
                )}

                {/* Loading State - Only when workspace not ready */}
                {!isReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-30">
                        <Loader2Icon className="animate-spin h-6 w-6 text-neutral-500" />
                        <p className="mt-3 text-xs text-neutral-500">Loading workspace...</p>
                    </div>
                )}

                {/* Generating Overlay - Blocks editor interaction while AI is working */}
                {loading && isReady && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a0a]/75 backdrop-blur-[2px] cursor-not-allowed">
                        <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-xl bg-[#111]/90 border border-white/10 shadow-2xl">
                            <div className="relative">
                                <Loader2Icon className="animate-spin h-7 w-7 text-white" />
                                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-neutral-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-white">Generating code</p>
                                <p className="text-[11px] text-neutral-500 mt-1">Hang tight - this only takes a moment</p>
                            </div>
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CodeView;

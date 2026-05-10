"use client";

import React from 'react';
import { Github } from 'lucide-react';
import Link from 'next/link';

function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/70 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex h-14 items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-7 w-7 rounded-md bg-white flex items-center justify-center">
                            <span className="text-black font-bold text-sm">A</span>
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-white">
                            AI Web Builder
                        </span>
                    </Link>

                    <a
                        href="https://github.com/ansarali41"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                        <Github className="h-4 w-4" />
                        <span className="hidden sm:inline">GitHub</span>
                    </a>
                </div>
            </div>
        </header>
    );
}

export default Header;

"use client";

import React from 'react';
import Link from 'next/link';

function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/70 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex h-14 items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-7 w-7 rounded-md bg-white flex items-center justify-center">
                            <span className="text-black font-bold text-sm">A</span>
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-white">
                            AI Web Builder
                        </span>
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default Header;

"use client";

import React from 'react';

function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="relative z-10 border-t border-white/[0.06] bg-[#0a0a0a]">
            <div className="mx-auto max-w-7xl px-6 py-6">
                <p className="text-center text-xs text-neutral-500">
                    All rights reserved &copy; {year}
                </p>
            </div>
        </footer>
    );
}

export default Footer;

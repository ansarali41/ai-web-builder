"use client";

import React, { useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const ConvexClientProvider = ({ children }) => {
    const convex = useMemo(() => {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) {
            return null;
        }
        return new ConvexReactClient(url);
    }, []);

    if (!convex) {
        return <>{children}</>;
    }

    return (
        <ConvexProvider client={convex}>
            {children}
        </ConvexProvider>
    );
};

export default ConvexClientProvider;
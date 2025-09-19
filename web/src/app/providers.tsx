"use client";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/shared/lib/queryClient";
import { ReactNode } from "react";
import { TextSelectionProvider } from "@/features/textSelection/components/TextSelectionProvider";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Main providers wrapper for the application
 * Includes React Query provider and dev tools
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* グローバルのテキスト選択検知（表示はブラウザ標準） */}
      <TextSelectionProvider />
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

"use client";

import { Toaster } from "@cm/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/orpc";
import { I18nProvider } from "@/lib/i18n";

import SolanaWalletProvider from "./solana-wallet-provider";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <SolanaWalletProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools />
          </QueryClientProvider>
        </SolanaWalletProvider>
        <Toaster />
      </ThemeProvider>
    </I18nProvider>
  );
}

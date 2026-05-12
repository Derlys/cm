import type { Metadata } from "next";
import { cookies } from "next/headers";

import "../index.css";
import Header from "@/components/header";
import { DEFAULT_LOCALE, isLocale } from "@/lib/locale-routing";

export const metadata: Metadata = {
  title: "cm",
  description: "cm",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieLocale = (await cookies()).get("cm_locale")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

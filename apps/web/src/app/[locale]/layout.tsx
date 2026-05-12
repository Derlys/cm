import { notFound } from "next/navigation";

import Header from "@/components/header";
import Providers from "@/components/providers";
import { isLocale, type Locale } from "@/lib/locale-routing";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "es" }];
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <Providers locale={locale as Locale}>
      <div className="grid min-h-svh grid-rows-[auto_1fr]">
        <Header />
        {children}
      </div>
    </Providers>
  );
}

import { redirect } from "next/navigation";

import { isLocale, localizePath, type Locale } from "@/lib/locale-routing";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(localizePath(isLocale(locale) ? locale : ("en" as Locale), "/creator"));
}

import { redirect } from "next/navigation";
import type { Route } from "next";

import { DEFAULT_LOCALE } from "@/lib/locale-routing";

export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}` as Route);
}

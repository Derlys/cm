import { Button } from "@cm/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@cm/ui/components/dropdown-menu";
import { Skeleton } from "@cm/ui/components/skeleton";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { localizePath } from "@/lib/locale-routing";

export default function UserMenu({ accountPanel }: { accountPanel?: React.ReactNode }) {
  const { locale, t } = useI18n();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Link href={localizePath(locale, "/login")}>
        <Button variant="outline">{t("common.signIn")}</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] overflow-visible rounded-lg border border-border bg-transparent p-0 shadow-2xl ring-0">
        {accountPanel}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

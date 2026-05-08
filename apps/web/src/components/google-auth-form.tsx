"use client";

import { Button } from "@cm/ui/components/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

import Loader from "./loader";

export default function GoogleAuthForm() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.replace("/");
    }
  }, [router, session?.user]);

  if (isPending) {
    return <Loader />;
  }

  if (session?.user) {
    return null;
  }

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    await authClient.signIn.social(
      {
        callbackURL: `${window.location.origin}/`,
        provider: "google",
      },
      {
        onError: (error) => {
          setIsSigningIn(false);
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  return (
    <div className="mx-auto mt-10 grid w-full max-w-md gap-6 rounded-lg border border-white/10 bg-card/80 p-6">
      <div className="grid gap-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-[#ff9f1c]/40 bg-[#ff9f1c]/10 text-xl font-black text-[#ff9f1c]">
          CM
        </div>
        <h1 className="text-3xl font-black">
          {locale === "es" ? "Bienvenido a Connectamind" : "Welcome to Connectamind"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {locale === "es" ? "Continua con tu cuenta de Google." : "Continue with your Google account."}
        </p>
      </div>
      <Button type="button" className="w-full" disabled={isSigningIn} onClick={signInWithGoogle}>
        {isSigningIn ? (locale === "es" ? "Redirigiendo..." : "Redirecting...") : t("common.continueWithGoogle")}
      </Button>
    </div>
  );
}

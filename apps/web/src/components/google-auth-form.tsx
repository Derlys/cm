"use client";

import { Button } from "@cm/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function GoogleAuthForm() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (isPending) {
    return <Loader />;
  }

  if (session?.user) {
    router.replace("/dashboard");
    return null;
  }

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    await authClient.signIn.social(
      {
        callbackURL: `${window.location.origin}/dashboard`,
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
    <div className="mx-auto mt-10 grid w-full max-w-md gap-6 p-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-bold">Welcome to Connectamind</h1>
        <p className="text-sm text-muted-foreground">Continue with your Google account.</p>
      </div>
      <Button type="button" className="w-full" disabled={isSigningIn} onClick={signInWithGoogle}>
        {isSigningIn ? "Redirecting..." : "Continue with Google"}
      </Button>
    </div>
  );
}

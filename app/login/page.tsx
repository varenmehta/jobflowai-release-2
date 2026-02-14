"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const fromParam = searchParams.get("from");
  const from =
    fromParam &&
    fromParam.startsWith("/") &&
    fromParam !== "/login" &&
    !fromParam.startsWith("/api/")
      ? fromParam
      : "/dashboard";
  const signInTarget = from;
  const signUpTarget = "/onboarding";

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return;
      const data = await res.json();
      if (active && data?.user) {
        router.replace(mode === "signup" ? signUpTarget : signInTarget);
      }
    };
    checkSession();
    return () => {
      active = false;
    };
  }, [router, mode, signInTarget, signUpTarget]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <h1 className="section-title">Welcome back</h1>
        <p className="section-subtitle">
          {mode === "signup" ? "Create your account to start setup." : "Sign in to continue to JobFlow AI."}
        </p>
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={() => signIn("google", { callbackUrl: `${window.location.origin}${signInTarget}` })}
        >
          Continue with Google (Sign in)
        </button>
        <button
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: "10px" }}
          onClick={() => signIn("google", { callbackUrl: `${window.location.origin}${signUpTarget}` })}
        >
          Create account with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

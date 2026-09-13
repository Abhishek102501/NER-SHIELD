"use client";

import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DEMO_USER } from "@/lib/auth";

function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueAsDemo() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST" });
      if (!res.ok) throw new Error("Login failed");
      const next = params.get("next") ?? "/command";
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not start the demo session. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent shadow-[0_0_24px_-4px_rgba(34,197,94,0.5)]">
            <Shield size={26} strokeWidth={2.2} />
          </span>
          <h1 className="text-[20px] font-bold tracking-tight text-fg">
            NER<span className="text-accent">-</span>SHIELD
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-fg-dim">
            Disaster Intelligence &amp; Response
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="eyebrow mb-1">Demo Environment</p>
          <h2 className="mb-4 text-[15px] font-semibold text-fg">
            Sign in to the Command Centre
          </h2>

          <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-fg-dim">Name</span>
              <span className="font-medium text-fg">{DEMO_USER.name}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-fg-dim">Role</span>
              <span className="font-medium text-fg">{DEMO_USER.role}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-fg-dim">Account type</span>
              <span className="font-medium text-fg">{DEMO_USER.accountType}</span>
            </div>
          </div>

          <button
            onClick={continueAsDemo}
            disabled={loading}
            className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Starting session…
              </>
            ) : (
              <>
                Continue as Demo <ArrowRight size={15} />
              </>
            )}
          </button>

          {error && (
            <p className="mt-3 text-center text-[11px] text-sev-critical">{error}</p>
          )}

          <p className="mt-4 text-center text-[10px] leading-relaxed text-fg-dim">
            No real credentials are used. This creates a demo/training
            session with no administrative access.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BusinessSetup } from "@/components/AuthComponents";

export default function OnboardingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("flowpilot_token");
    if (!stored) {
      router.push("/login");
      return;
    }
    setToken(stored);

    // Verify if onboarding is actually needed
    api<{ business: unknown; user: { id: string; name: string; email: string } }>("/api/dashboard", { token: stored })
      .then((dash) => {
        if (dash.business) {
          router.push("/dashboard");
        } else {
          setUser(dash.user);
          setLoading(false);
        }
      })
      .catch(() => {
        window.localStorage.removeItem("flowpilot_token");
        router.push("/login");
      });
  }, [router]);

  async function businessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/onboarding/business", {
        method: "POST",
        body: JSON.stringify(values),
        token,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving onboarding profile failed.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400 font-semibold text-xs select-none">
        Loading onboarding...
      </div>
    );
  }

  return (
    <BusinessSetup
      submit={businessSubmit}
      loading={submitting}
      error={error}
      user={user ? { ...user, plan: "free" } : null}
    />
  );
}

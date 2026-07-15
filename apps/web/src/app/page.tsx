"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("google_token");
    const googleError = params.get("google_error");

    if (googleToken) {
      window.sessionStorage.setItem("flowpilot_skip_sandbox", "1");
      window.localStorage.setItem("flowpilot_token", googleToken);
      router.push("/dashboard");
      return;
    }

    if (googleError) {
      window.history.replaceState({}, "", "/");
    }

    const token = window.localStorage.getItem("flowpilot_token");
    if (token) {
      router.push("/dashboard");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400 font-semibold text-xs select-none">
        Loading ACE...
      </div>
    );
  }

  return <LandingPage />;
}

"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthScreen, AuthMode } from "@/components/AuthComponents";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetPasswordToken, setResetPasswordToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset-password");
    if (token) {
      setResetPasswordToken(token);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api<{ token: string }>(`/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      window.sessionStorage.setItem("flowpilot_skip_sandbox", "1");
      window.localStorage.setItem("flowpilot_token", data.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function forgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const data = await api<{ message: string }>("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setNotice(data.message);
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request password reset");
    } finally {
      setLoading(false);
    }
  }

  async function resetPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const data = await api<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ ...values, token: resetPasswordToken }),
      });
      setNotice(data.message);
      setResetPasswordToken("");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  function startGoogleLogin() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
    window.location.assign(`${API_URL}/api/auth/google`);
  }

  async function launchSandbox() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ token: string }>("/api/sandbox/start", {
        method: "POST",
        body: "{}",
      });
      window.localStorage.setItem("flowpilot_token", data.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch sandbox workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      mode={mode}
      setMode={(newMode) => {
        if (newMode === "login") {
          router.push("/login");
        } else {
          setMode(newMode);
        }
      }}
      submit={submit}
      forgotPasswordSubmit={forgotPasswordSubmit}
      resetPasswordSubmit={resetPasswordSubmit}
      resetPasswordToken={resetPasswordToken}
      launchSandbox={launchSandbox}
      googleLogin={startGoogleLogin}
      loading={loading}
      notice={notice}
      error={error}
    />
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Pause,
  Play,
  PlugZap,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";

type Page = "dashboard" | "automations" | "leads" | "approvals" | "templates" | "integrations" | "activity" | "settings";
type AuthMode = "signup" | "login" | "forgot";
type User = { id: string; name: string; email: string; plan: string };
type Business = { id: string; name: string; type: string; tone: string };
type WorkflowRow = { id: string; name: string; status: string; runs: number; templateId: string };
type Lead = { id: string; name: string; email: string | null; phone: string | null; message: string; source: string; status: string; createdAt: string };
type Approval = { id: string; leadId: string; status: string; draft: string; createdAt: string; lead: Lead | null };
type Integration = { id: string; provider: string; status: string };
type ActivityRow = { id: string; label: string; source: string; status: string; createdAt: string; type: string };
type Template = { id: string; title: string; description: string; category: string; recommended: boolean };
type SystemStatus = { mode: string; services: { ai: { provider: string; configured: boolean }; billing: { provider: string; configured: boolean }; database: { provider: string; configured: boolean }; leadWebhook: { configured: boolean }; gmail: { configured: boolean }; hubspot: { configured: boolean }; whatsapp: { configured: boolean }; accountEmail: { provider: string; configured: boolean } } };
type Dashboard = {
  user: User;
  business: Business | null;
  metrics: { activeAutomations: number; leadsProcessedToday: number; pendingApprovals: number; errors: number; timeSavedMinutesThisWeek: number; successRate: number };
  workflows: WorkflowRow[];
  activity: ActivityRow[];
  approvals: Approval[];
};

const navItems: Array<[Page, LucideIcon, string]> = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["automations", Workflow, "Automations"],
  ["leads", Mail, "Leads"],
  ["approvals", ShieldCheck, "Approvals"],
  ["templates", FileText, "Templates"],
  ["integrations", PlugZap, "Integrations"],
  ["activity", Activity, "Activity"],
  ["settings", Settings, "Settings"],
];

const emptyMetrics: Dashboard["metrics"] = { activeAutomations: 0, leadsProcessedToday: 0, pendingApprovals: 0, errors: 0, timeSavedMinutesThisWeek: 0, successRate: 100 };
const PUBLIC_SANDBOX_ENABLED = process.env.NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED !== "false";
const HIDE_PROVIDER_SETUP = process.env.NEXT_PUBLIC_HIDE_PROVIDER_SETUP === "true";

export default function Home() {
  const [token, setToken] = useState("");
  const [page, setPage] = useState<Page>("dashboard");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [resetPasswordToken, setResetPasswordToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(<T,>(path: string, options: RequestInit = {}) => api<T>(path, { ...options, token }), [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [dash, workflowData, leadData, approvalData, integrationData, activityData, templateData, statusData] = await Promise.all([
        request<Dashboard>("/api/dashboard"),
        request<{ workflows: WorkflowRow[] }>("/api/workflows"),
        request<{ leads: Lead[] }>("/api/leads"),
        request<{ approvals: Approval[] }>("/api/approvals"),
        request<{ integrations: Integration[] }>("/api/integrations"),
        request<{ activity: ActivityRow[] }>("/api/activity"),
        api<{ templates: Template[] }>("/api/templates"),
        api<SystemStatus>("/api/system/status"),
      ]);
      setDashboard(dash);
      setUser(dash.user);
      setBusiness(dash.business);
      setWorkflows(workflowData.workflows);
      setLeads(leadData.leads);
      setApprovals(approvalData.approvals);
      setIntegrations(integrationData.integrations);
      setActivity(activityData.activity);
      setTemplates(templateData.templates);
      setSystemStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace");
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sandbox = params.get("sandbox") || params.get("demo");
    const verificationToken = params.get("verify-email");
    const passwordToken = params.get("reset-password");
    const googleToken = params.get("google_token");
    const googleError = params.get("google_error");
    const isNewUser = params.get("new_user") === "true";
    if (googleToken) {
      window.sessionStorage.setItem("flowpilot_skip_sandbox", "1");
      window.localStorage.setItem("flowpilot_token", googleToken);
      setBusiness(null);
      setDashboard(null);
      setWorkflows([]);
      setLeads([]);
      setApprovals([]);
      setIntegrations([]);
      setActivity([]);
      setTemplates([]);
      setSystemStatus(null);
      setToken(googleToken);
      setNotice(isNewUser ? "Welcome to FlowPilot! Gmail is connected. Set up your business below." : "Welcome back! Signed in with Google.");
      window.history.replaceState({}, "", "/");
      return;
    }
    if (googleError) {
      setError(`Google sign-in failed: ${googleError}`);
      window.history.replaceState({}, "", "/");
    }
    if (sandbox === "1" && PUBLIC_SANDBOX_ENABLED) {
      api<{ token: string }>("/api/sandbox/start", { method: "POST", body: "{}" })
        .then((data) => {
          window.localStorage.setItem("flowpilot_token", data.token);
          setToken(data.token);
          setPage("dashboard");
          setNotice("Sandbox workspace loaded. Explore the product with safe sample data.");
          window.history.replaceState({}, "", "/");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Could not launch sandbox workspace"));
      return;
    }
    if (verificationToken) {
      api<{ message: string }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: verificationToken }) })
        .then((data) => setNotice(data.message))
        .catch((err) => setError(err instanceof Error ? err.message : "Could not verify email"));
      window.history.replaceState({}, "", "/");
    }
    if (passwordToken) {
      window.localStorage.removeItem("flowpilot_token");
      setToken("");
      setResetPasswordToken(passwordToken);
      window.history.replaceState({}, "", "/");
    }
    const integration = params.get("integration");
    if (integration) {
      setNotice(integration.endsWith("_connected") ? "Integration connected successfully." : "Integration connection failed. Check your provider settings and try again.");
      window.history.replaceState({}, "", "/");
    }
    const stored = window.localStorage.getItem("flowpilot_token") || "";
    setToken(stored);
  }, []);

  useEffect(() => {
    if (token) refresh();
  }, [refresh, token]);

  function saveToken(value: string) {
    window.localStorage.setItem("flowpilot_token", value);
    setToken(value);
  }

  function logout() {
    window.localStorage.removeItem("flowpilot_token");
    setToken("");
    setUser(null);
    setBusiness(null);
    setDashboard(null);
    setWorkflows([]);
    setLeads([]);
    setApprovals([]);
    setIntegrations([]);
    setActivity([]);
    setTemplates([]);
    setSystemStatus(null);
    setNotice("");
    setError("");
  }

  async function authSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api<{ token: string; user: User }>(`/api/auth/${authMode}`, { method: "POST", body: JSON.stringify(values) });
      window.sessionStorage.setItem("flowpilot_skip_sandbox", "1");
      setBusiness(null);
      setDashboard(null);
      setWorkflows([]);
      setLeads([]);
      setApprovals([]);
      setIntegrations([]);
      setActivity([]);
      setTemplates([]);
      setSystemStatus(null);
      saveToken(data.token);
      setUser(data.user);
      setNotice(authMode === "signup" ? "Account created. Add your business details." : "Welcome back.");
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
      const data = await api<{ message: string }>("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify(values) });
      setNotice(data.message);
      setAuthMode("login");
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
      const data = await api<{ message: string }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ ...values, token: resetPasswordToken }) });
      setNotice(data.message);
      setResetPasswordToken("");
      setAuthMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  async function launchSandbox() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ token: string; user: User }>("/api/sandbox/start", { method: "POST", body: "{}" });
      setBusiness(null);
      setDashboard(null);
      setWorkflows([]);
      setLeads([]);
      setApprovals([]);
      setIntegrations([]);
      setActivity([]);
      setTemplates([]);
      setSystemStatus(null);
      saveToken(data.token);
      setUser(data.user);
      setPage("dashboard");
      setNotice("Sandbox workspace loaded. Explore the product with safe sample data.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch sandbox workspace");
    } finally {
      setLoading(false);
    }
  }

  async function businessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await mutate("/api/onboarding/business", { method: "POST", body: JSON.stringify(values) }, "Business profile saved.");
  }

  async function leadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await mutate("/api/leads", { method: "POST", body: JSON.stringify({ ...values, source: "manual" }) }, "Lead captured and AI follow-up draft prepared.");
    form.reset();
    setPage("approvals");
  }

  async function mutate(path: string, options: RequestInit, success: string) {
    setLoading(true);
    setError("");
    try {
      await request(path, options);
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function resolveApproval(form: HTMLFormElement, approval: Approval, action: "approve" | "reject") {
    const draft = String(new FormData(form).get("draft") || approval.draft);
    await mutate(`/api/approvals/${approval.id}/${action}`, { method: "POST", body: JSON.stringify({ draft }) }, action === "approve" ? "Draft approved and follow-up marked as sent." : "Draft rejected for review.");
  }

  async function resetSandbox() {
    setLoading(true);
    setError("");
    try {
      const data = await request<{ token: string }>("/api/sandbox/reset", { method: "POST", body: "{}" });
      saveToken(data.token);
      setPage("dashboard");
      setNotice("Sandbox workspace reset.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset sandbox workspace");
    } finally {
      setLoading(false);
    }
  }

  async function startSubscriptionCheckout() {
    setLoading(true);
    setError("");
    try {
      const data = await request<{ keyId: string; subscription: { id: string } }>("/api/billing/subscription", { method: "POST", body: "{}" });
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      const Razorpay = (window as typeof window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (!Razorpay) throw new Error("Razorpay checkout could not be loaded");
      new Razorpay({
        key: data.keyId,
        subscription_id: data.subscription.id,
        name: "FlowPilot AI",
        description: "FlowPilot Pro subscription",
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#2563eb" },
        handler: () => setNotice("Payment authorized. Razorpay will confirm the subscription through the webhook.")
      }).open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Razorpay checkout");
    } finally {
      setLoading(false);
    }
  }

  async function connectIntegration(provider: string, title: string) {
    setLoading(true);
    setError("");
    try {
      const data = await request<{ authorizationUrl?: string; mode: string }>(`/api/integrations/${provider}/connect`, { method: "POST", body: "{}" });
      if (data.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
        return;
      }
      setNotice(`${title} connected in local demo mode.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect integration");
    } finally {
      setLoading(false);
    }
  }

  async function syncGmailInbox() {
    setLoading(true);
    setError("");
    try {
      const data = await request<{ created: number }>("/api/integrations/gmail/sync", { method: "POST", body: "{}" });
      setNotice(data.created ? `Found ${data.created} new lead${data.created === 1 ? "" : "s"} in Gmail.` : "Gmail inbox checked - no new leads found.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync Gmail inbox");
    } finally {
      setLoading(false);
    }
  }

  function startGoogleLogin() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
    window.location.assign(`${API_URL}/api/auth/google`);
  }

  if (!token) return <AuthScreen error={error} forgotPasswordSubmit={forgotPasswordSubmit} googleLogin={startGoogleLogin} launchSandbox={launchSandbox} loading={loading} mode={authMode} notice={notice} resetPasswordSubmit={resetPasswordSubmit} resetPasswordToken={resetPasswordToken} setMode={setAuthMode} submit={authSubmit} />;
  if (!business) return <BusinessSetup submit={businessSubmit} loading={loading} error={error} user={user} />;

  const metrics = dashboard?.metrics || emptyMetrics;
  const isSandbox = user?.id === "usr_demo_founder";
  const visibleNavItems = isSandbox && HIDE_PROVIDER_SETUP ? navItems.filter(([key]) => key !== "settings") : navItems;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <Brand />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold">{business.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>
          <button className="icon-button" onClick={logout} title="Log out" type="button"><LogOut size={17} /></button>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {visibleNavItems.map(([key, Icon, label]) => (
              <button className={`nav-item ${page === key ? "nav-active" : ""}`} key={key} onClick={() => setPage(key)} type="button">
                <Icon size={16} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-8 border-t border-slate-200 pt-4">
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-900">
              <div className="mb-1 font-bold">{isSandbox ? "Sandbox workspace" : "Free plan"}</div>
              {isSandbox ? "Safe sample data for visitors." : "Personal workspace is active."}
            </div>
            {!isSandbox && <div className="mt-3 text-xs text-slate-500">AI drafts: {systemStatus?.services.ai.provider || "checking"}</div>}
            {isSandbox && <button className="secondary-button mt-3 w-full" disabled={loading} onClick={resetSandbox} type="button"><RefreshCw size={14} />Reset sandbox</button>}
            {isSandbox && <button className="mt-3 w-full text-left text-xs font-semibold text-blue-600" onClick={() => { window.sessionStorage.setItem("flowpilot_skip_sandbox", "1"); logout(); }} type="button">Create your own workspace</button>}
          </div>
        </aside>
        <section className="min-w-0 flex-1 p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-blue-600">{page}</p>
              <h1 className="mt-1 text-2xl font-bold">{pageTitle(page)}</h1>
            </div>
            <button className="icon-button" disabled={loading} onClick={refresh} title="Refresh workspace" type="button"><RefreshCw className={loading ? "animate-spin" : ""} size={17} /></button>
          </div>
          {notice && <Banner text={notice} tone="success" />}
          {error && <Banner text={error} tone="error" />}
          {page === "dashboard" && <DashboardPage metrics={metrics} workflows={workflows} activity={activity} setPage={setPage} />}
          {page === "automations" && <AutomationsPage workflows={workflows} mutate={mutate} />}
          {page === "leads" && <LeadsPage leads={leads} submit={leadSubmit} loading={loading} />}
          {page === "approvals" && <ApprovalsPage approvals={approvals} resolve={resolveApproval} loading={loading} />}
          {page === "templates" && <TemplatesPage templates={templates} workflows={workflows} mutate={mutate} />}
          {page === "integrations" && <IntegrationsPage connect={connectIntegration} integrations={integrations} loading={loading} syncGmail={syncGmailInbox} />}
          {page === "activity" && <ActivityPage rows={activity} />}
          {page === "settings" && !isSandbox && <SettingsPage business={business} submit={businessSubmit} loading={loading} startSubscriptionCheckout={startSubscriptionCheckout} systemStatus={systemStatus} />}
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white"><Bot size={19} /></div><div><div className="text-sm font-bold">FlowPilot AI</div><div className="text-xs text-slate-500">Operations workspace</div></div></div>;
}

function AuthScreen({ mode, setMode, submit, forgotPasswordSubmit, resetPasswordSubmit, resetPasswordToken, launchSandbox, googleLogin, loading, notice, error }: { mode: AuthMode; setMode: (mode: AuthMode) => void; submit: (event: FormEvent<HTMLFormElement>) => void; forgotPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void; resetPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void; resetPasswordToken: string; launchSandbox: () => void; googleLogin: () => void; loading: boolean; notice: string; error: string }) {
  if (resetPasswordToken) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="w-full max-w-md"><div className="mb-6"><Brand /></div><div className="panel p-6"><h1 className="text-xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-slate-500">Use at least eight characters.</p>{error && <Banner text={error} tone="error" />}<form className="mt-5 space-y-4" onSubmit={resetPasswordSubmit}><Field label="New password" name="password" placeholder="Minimum 8 characters" required type="password" /><button className="primary-button w-full" disabled={loading} type="submit">{loading ? "Updating..." : "Update password"}</button></form></div></div></main>;
  if (mode === "forgot") return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="w-full max-w-md"><div className="mb-6"><Brand /></div><div className="panel p-6"><h1 className="text-xl font-bold">Reset your password</h1><p className="mt-2 text-sm text-slate-500">We will send a recovery link if the account exists.</p>{error && <Banner text={error} tone="error" />}<form className="mt-5 space-y-4" onSubmit={forgotPasswordSubmit}><Field label="Work email" name="email" placeholder="alex@company.com" required type="email" /><button className="primary-button w-full" disabled={loading} type="submit">{loading ? "Sending..." : "Send recovery link"}</button></form><button className="mt-4 w-full text-sm font-semibold text-blue-600" onClick={() => setMode("login")} type="button">Back to login</button></div></div></main>;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6"><Brand /></div>
        <div className="panel p-6">
          <h1 className="text-xl font-bold">{mode === "signup" ? "Create your FlowPilot account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-slate-500">Connect your Gmail and start automating leads in minutes.</p>
          {notice && <Banner text={notice} tone="success" />}
          {error && <Banner text={error} tone="error" />}
          <button
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            disabled={loading}
            onClick={googleLogin}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {mode === "signup" ? "Continue with Google" : "Sign in with Google"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">Gmail access is requested so FlowPilot can read leads and send follow-ups on your behalf.</p>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email &amp; password<span className="h-px flex-1 bg-slate-200" /></div>
          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && <Field label="Full name" name="name" placeholder="Alex Johnson" required />}
            <Field label="Work email" name="email" placeholder="alex@company.com" required type="email" />
            <Field label="Password" name="password" placeholder="Minimum 8 characters" required type="password" />
            <button className="primary-button w-full" disabled={loading} type="submit">{loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}</button>
          </form>
          {mode === "login" && <button className="mt-4 w-full text-sm font-semibold text-blue-600" onClick={() => setMode("forgot")} type="button">Forgot password?</button>}
          <button className="mt-4 w-full text-sm font-semibold text-blue-600" onClick={() => { window.sessionStorage.setItem("flowpilot_skip_sandbox", "1"); setMode(mode === "signup" ? "login" : "signup"); }} type="button">{mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}</button>
          <div className="mt-5 border-t border-slate-100 pt-4"><button className="secondary-button w-full border-blue-200 bg-blue-50 text-blue-700" disabled={loading} onClick={launchSandbox} type="button"><Sparkles size={16} />Try FlowPilot sandbox</button></div>
        </div>
      </div>
    </main>
  );
}

function BusinessSetup({ submit, loading, error, user }: { submit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; error: string; user: User | null }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="w-full max-w-xl"><div className="mb-6"><Brand /></div><div className="panel p-6"><p className="text-xs font-bold uppercase text-blue-600">Onboarding</p><h1 className="mt-1 text-xl font-bold">Set up your business</h1><p className="mt-2 text-sm text-slate-500">Hi {user?.name?.split(" ")[0] || "there"}, these details personalize your follow-up drafts.</p>{error && <Banner text={error} tone="error" />}<form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}><div className="sm:col-span-2"><Field label="Business name" name="name" placeholder="e.g. Raj Digital Agency" required /></div><Select label="Business type" name="type" options={["agency", "e-commerce", "service_business", "startup", "solo_founder", "other"]} /><Select label="Reply tone" name="tone" options={["professional", "friendly"]} /><button className="primary-button sm:col-span-2" disabled={loading} type="submit">{loading ? "Saving..." : "Save and open workspace"}</button></form></div></div></main>;
}

function DashboardPage({ metrics, workflows, activity, setPage }: { metrics: Dashboard["metrics"]; workflows: WorkflowRow[]; activity: ActivityRow[]; setPage: (page: Page) => void }) {
  const cards: Array<[string, string | number, LucideIcon]> = [["Active automations", metrics.activeAutomations, Workflow], ["Leads processed", metrics.leadsProcessedToday, Mail], ["Pending approvals", metrics.pendingApprovals, Clock3], ["Success rate", `${metrics.successRate}%`, CheckCircle2]];
  return <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <article className="panel p-4" key={label}><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase text-slate-500">{label}</span><Icon className="text-blue-600" size={17} /></div><div className="text-2xl font-bold">{value}</div></article>)}</div><div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><ActivityCard rows={activity.slice(0, 5)} /><article className="panel p-5"><h2 className="font-bold">Quick actions</h2><p className="mt-1 text-sm text-slate-500">Move a real lead through the local MVP.</p><div className="mt-5 space-y-2"><ActionButton icon={Plus} label="Capture a test lead" onClick={() => setPage("leads")} /><ActionButton icon={ShieldCheck} label={`Review approvals (${metrics.pendingApprovals})`} onClick={() => setPage("approvals")} /><ActionButton icon={Workflow} label={`Manage automations (${workflows.length})`} onClick={() => setPage("automations")} /></div></article></div></>;
}

function AutomationsPage({ workflows, mutate }: { workflows: WorkflowRow[]; mutate: (path: string, options: RequestInit, success: string) => Promise<void> }) {
  return <div className="space-y-3">{workflows.length ? workflows.map((row) => <article className="panel flex items-center justify-between p-5" key={row.id}><div><h2 className="font-bold">{row.name}</h2><p className="mt-1 text-sm text-slate-500">{row.runs} completed runs - {row.status}</p></div><button className="secondary-button" onClick={() => mutate(`/api/workflows/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: row.status === "active" ? "paused" : "active" }) }, `Automation ${row.status === "active" ? "paused" : "resumed"}.`)} type="button">{row.status === "active" ? <Pause size={15} /> : <Play size={15} />}{row.status === "active" ? "Pause" : "Resume"}</button></article>) : <Empty text="No automations yet. Activate a template to begin." />}</div>;
}

function LeadsPage({ leads, submit, loading }: { leads: Lead[]; submit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean }) {
  return <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]"><form className="panel space-y-4 p-5" onSubmit={submit}><h2 className="font-bold">Capture test lead</h2><p className="text-sm text-slate-500">This simulates a website form or inbox inquiry.</p><Field label="Lead name" name="name" placeholder="Sarah Chen" required /><Field label="Email" name="email" placeholder="sarah@example.com" required type="email" /><Field label="Phone" name="phone" placeholder="+91 98765 43210" /><label className="block text-sm font-semibold">Inquiry<textarea className="input mt-2 min-h-28 resize-y" name="message" placeholder="I need help automating follow-ups for my agency." required /></label><button className="primary-button w-full" disabled={loading} type="submit"><Sparkles size={16} />{loading ? "Preparing draft..." : "Capture lead and draft reply"}</button></form><article className="panel p-5"><h2 className="font-bold">Lead inbox</h2><div className="mt-4 space-y-3">{leads.length ? leads.map((lead) => <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm" key={lead.id}><div><div className="font-semibold">{lead.name}</div><div className="mt-1 text-xs text-slate-500">{lead.email} - {lead.source}</div></div><Badge text={lead.status} /></div>) : <p className="text-sm text-slate-500">Your captured leads will appear here.</p>}</div></article></div>;
}

function ApprovalsPage({ approvals, resolve, loading }: { approvals: Approval[]; resolve: (form: HTMLFormElement, approval: Approval, action: "approve" | "reject") => Promise<void>; loading: boolean }) {
  const pending = approvals.filter((item) => item.status === "pending");
  return <div className="space-y-4">{pending.length ? pending.map((approval) => <form className="panel p-5" key={approval.id} onSubmit={(event) => { event.preventDefault(); resolve(event.currentTarget, approval, "approve"); }}><div className="mb-3 flex items-start justify-between"><div><h2 className="font-bold">{approval.lead?.name || "New lead"}</h2><p className="mt-1 text-sm text-slate-500">{approval.lead?.email} - AI follow-up draft</p></div><Badge text="pending" /></div><textarea className="input min-h-32 resize-y text-sm leading-6" defaultValue={approval.draft} name="draft" /><div className="mt-4 flex gap-2"><button className="primary-button" disabled={loading} type="submit"><Send size={15} />Approve and send</button><button className="secondary-button" disabled={loading} onClick={(event) => { event.preventDefault(); resolve(event.currentTarget.form!, approval, "reject"); }} type="button"><XCircle size={15} />Reject</button></div></form>) : <Empty text="No pending approvals. Capture a lead to generate a draft." />}</div>;
}

function TemplatesPage({ templates, workflows, mutate }: { templates: Template[]; workflows: WorkflowRow[]; mutate: (path: string, options: RequestInit, success: string) => Promise<void> }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map((template) => { const active = workflows.some((row) => row.templateId === template.id); return <article className="panel p-5" key={template.id}><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-md bg-blue-50 text-blue-700"><Workflow size={18} /></div>{template.recommended && <Badge text="recommended" />}</div><h2 className="mt-4 font-bold">{template.title}</h2><p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">{template.description}</p><button className={active ? "secondary-button mt-4" : "primary-button mt-4"} disabled={active} onClick={() => mutate("/api/workflows/from-template", { method: "POST", body: JSON.stringify({ templateId: template.id }) }, `${template.title} activated.`)} type="button">{active ? <CheckCircle2 size={15} /> : <Plus size={15} />}{active ? "Active" : "Activate"}</button></article>; })}</div>;
}

function IntegrationsPage({ integrations, connect, syncGmail, loading }: { integrations: Integration[]; connect: (provider: string, title: string) => Promise<void>; syncGmail: () => Promise<void>; loading: boolean }) {
  const providers = [["gmail", Mail, "Gmail", "Monitor and send lead follow-up emails"], ["whatsapp", MessageSquare, "WhatsApp Business", "Route customer messages to your team"], ["hubspot", PlugZap, "HubSpot CRM", "Sync leads and follow-up activity"]] as const;
  return <div className="grid gap-4 lg:grid-cols-3">{providers.map(([provider, Icon, title, description]) => { const connected = integrations.some((row) => row.provider === provider && row.status === "connected"); return <article className="panel p-5" key={provider}><Icon className="text-blue-600" size={22} /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">{description}</p><button className={connected ? "secondary-button mt-4" : "primary-button mt-4"} disabled={connected} onClick={() => connect(provider, title)} type="button">{connected ? <CheckCircle2 size={15} /> : <PlugZap size={15} />}{connected ? "Connected" : "Connect"}</button>{provider === "gmail" && connected && <button className="secondary-button mt-2 w-full" disabled={loading} onClick={syncGmail} type="button"><RefreshCw size={15} />{loading ? "Checking inbox..." : "Sync inbox now"}</button>}</article>; })}</div>;
}

function ActivityPage({ rows }: { rows: ActivityRow[] }) { return <ActivityCard rows={rows} />; }
function SettingsPage({ business, submit, loading, startSubscriptionCheckout, systemStatus }: { business: Business; submit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; startSubscriptionCheckout: () => Promise<void>; systemStatus: SystemStatus | null }) {
  const services = systemStatus?.services;
  return <div className="grid max-w-4xl gap-5 xl:grid-cols-[1.3fr_1fr]"><form className="panel grid gap-4 p-5 sm:grid-cols-2" onSubmit={submit}><div className="sm:col-span-2"><h2 className="font-bold">Business settings</h2><p className="mt-1 text-sm text-slate-500">Update the profile used to personalize AI drafts.</p></div><div className="sm:col-span-2"><Field defaultValue={business.name} label="Business name" name="name" required /></div><Select defaultValue={business.type} label="Business type" name="type" options={["agency", "e-commerce", "service_business", "startup", "solo_founder", "other"]} /><Select defaultValue={business.tone} label="Reply tone" name="tone" options={["professional", "friendly"]} /><button className="primary-button sm:col-span-2" disabled={loading} type="submit">{loading ? "Saving..." : "Save settings"}</button></form><article className="panel p-5"><h2 className="font-bold">Production readiness</h2><p className="mt-1 text-sm text-slate-500">Configured services detected by the API.</p><div className="mt-4 space-y-3"><ServiceRow label="AI drafts" value={services?.ai.provider || "checking"} ready={Boolean(services?.ai.configured)} /><ServiceRow label="Database" value={services?.database.provider || "checking"} ready={Boolean(services?.database.configured)} /><ServiceRow label="Account email" value={services?.accountEmail.provider || "checking"} ready={Boolean(services?.accountEmail.configured)} /><ServiceRow label="Razorpay billing" value={services?.billing.configured ? "configured" : "setup required"} ready={Boolean(services?.billing.configured)} /><ServiceRow label="Lead webhook" value={services?.leadWebhook.configured ? "secured" : "setup required"} ready={Boolean(services?.leadWebhook.configured)} /><ServiceRow label="Gmail OAuth" value={services?.gmail.configured ? "configured" : "setup required"} ready={Boolean(services?.gmail.configured)} /><ServiceRow label="HubSpot OAuth" value={services?.hubspot.configured ? "configured" : "setup required"} ready={Boolean(services?.hubspot.configured)} /><ServiceRow label="WhatsApp API" value={services?.whatsapp.configured ? "configured" : "setup required"} ready={Boolean(services?.whatsapp.configured)} /></div><button className="secondary-button mt-5 w-full" disabled={loading || !services?.billing.configured} onClick={startSubscriptionCheckout} type="button"><Settings size={15} />Open Razorpay checkout</button></article></div>;
}

function ActivityCard({ rows }: { rows: ActivityRow[] }) { return <article className="panel p-5"><h2 className="font-bold">Recent activity</h2><div className="mt-4 space-y-3">{rows.length ? rows.map((row) => <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm" key={row.id}><div><div className="font-semibold">{row.label}</div><div className="mt-1 text-xs text-slate-500">{row.source} - {new Date(row.createdAt).toLocaleString()}</div></div><Badge text={row.status} /></div>) : <p className="text-sm text-slate-500">Activity will appear as you use the workspace.</p>}</div></article>; }
function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) { return <button className="flex w-full items-center gap-3 rounded-md border border-slate-200 px-3 py-3 text-left text-sm font-semibold hover:bg-slate-50" onClick={onClick} type="button"><Icon className="text-blue-600" size={16} />{label}</button>; }
function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm font-semibold">{label}<input className="input mt-2" name={name} {...props} /></label>; }
function Select({ label, name, options, ...props }: { label: string; name: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) { return <label className="block text-sm font-semibold">{label}<select className="input mt-2" name={name} {...props}>{options.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>; }
function Badge({ text }: { text: string }) { const tone = text === "pending" || text.includes("required") || text === "local" || text === "local json" || text === "checking" ? "bg-amber-50 text-amber-700" : text === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{text.replaceAll("_", " ")}</span>; }
function Banner({ text, tone }: { text: string; tone: "success" | "error" }) { return <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{text}</div>; }
function Empty({ text }: { text: string }) { return <div className="panel p-8 text-center text-sm text-slate-500">{text}</div>; }
function ServiceRow({ label, value, ready }: { label: string; value: string; ready: boolean }) { return <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm"><span className="font-semibold">{label}</span><Badge text={ready ? value : `${value}`} /></div>; }
function pageTitle(page: Page) { return ({ dashboard: "Operations overview", automations: "Automation status", leads: "Lead inbox", approvals: "Approval queue", templates: "Workflow templates", integrations: "Connected tools", activity: "Activity log", settings: "Workspace settings" })[page]; }
function loadScript(src: string) { return new Promise<void>((resolve, reject) => { const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`); if (existing) return resolve(); const script = document.createElement("script"); script.src = src; script.onload = () => resolve(); script.onerror = () => reject(new Error("Could not load payment checkout")); document.body.appendChild(script); }); }

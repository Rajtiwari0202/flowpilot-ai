"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LogOut, RefreshCw, LayoutDashboard, Mail, Workflow, ShieldCheck, FileText, PlugZap, Activity, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { Brand, Banner, BusinessSetup } from "@/components/AuthComponents";
import { LandingPage } from "@/components/LandingPage";

import { Page, AuthMode, User, Business, WorkflowRow, Lead, Approval, Integration, ActivityRow, Template, SystemStatus, Dashboard } from "./dashboard/types";
import { DashboardPage } from "./dashboard/DashboardPage";
import { AutomationsPage } from "./dashboard/AutomationsPage";
import { LeadsPage } from "./dashboard/LeadsPage";
import { ApprovalsPage } from "./dashboard/ApprovalsPage";
import { TemplatesPage } from "./dashboard/TemplatesPage";
import { IntegrationsPage } from "./dashboard/IntegrationsPage";
import { ActivityPage } from "./dashboard/ActivityPage";
import { SettingsPage } from "./dashboard/SettingsPage";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["automations", "Automations", Workflow],
  ["leads", "Leads", Mail],
  ["approvals", "Approvals", ShieldCheck],
  ["templates", "Templates", FileText],
  ["integrations", "Integrations", PlugZap],
  ["activity", "Activity", Activity],
  ["settings", "Settings", Settings],
] as const;

const emptyMetrics = { activeAutomations: 0, leadsProcessedToday: 0, pendingApprovals: 0, errors: 0, timeSavedMinutesThisWeek: 0, successRate: 100 };
const PUBLIC_SANDBOX_ENABLED = process.env.NEXT_PUBLIC_PUBLIC_SANDBOX_ENABLED !== "false";
const HIDE_PROVIDER_SETUP = process.env.NEXT_PUBLIC_HIDE_PROVIDER_SETUP === "true";

export default function Home() {
  const [token, setToken] = useState("");
  const [page, setPage] = useState<Page>("dashboard");
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
      setToken(googleToken);
      setNotice(isNewUser ? "Welcome to ACE! Gmail is connected. Set up your business below." : "Welcome back! Signed in with Google.");
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
      window.localStorage.setItem("flowpilot_token", data.token);
      setToken(data.token);
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
        name: "ACE",
        description: "ACE Pro subscription",
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#ea580c" },
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

  if (!token) return <LandingPage />;
  if (!business) return <BusinessSetup submit={businessSubmit} loading={loading} error={error} user={user} />;

  const metrics = dashboard?.metrics || emptyMetrics;
  const isSandbox = user?.id === "usr_demo_founder";
  const visibleNavItems = isSandbox && HIDE_PROVIDER_SETUP ? navItems.filter(([key]) => key !== "settings") : navItems;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-black text-slate-950 dark:text-zinc-300">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-[#171717] bg-white dark:bg-[#0A0A0A] px-6">
        <Brand />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{business.name}</div>
            <div className="text-xs text-slate-500 dark:text-zinc-500">{user?.email}</div>
          </div>
          <button className="icon-button" onClick={logout} title="Log out" type="button"><LogOut size={17} /></button>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-[#171717] bg-white dark:bg-[#0A0A0A] p-3">
          <nav className="space-y-1">
            {visibleNavItems.map(([key, label, Icon]) => (
              <button className={`nav-item ${page === key ? "nav-active" : ""}`} key={key} onClick={() => setPage(key)} type="button">
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-8 border-t border-slate-200 dark:border-[#171717] pt-4">
            <div className="rounded-md bg-slate-100 dark:bg-[#0E0E0E] border border-slate-200/60 dark:border-[#1C1C1C] p-2.5 text-[11px]">
              <div className="font-bold uppercase tracking-wider text-[9px] text-zinc-500 dark:text-zinc-500 mb-0.5">
                {isSandbox ? "Sandbox Mode" : "Free Plan"}
              </div>
              <div className="font-semibold text-slate-800 dark:text-zinc-200 leading-normal">
                {isSandbox ? "Demo Workspace" : "Personal Workspace"}
              </div>
            </div>
            {!isSandbox && <div className="mt-3 text-[11px] text-slate-500 dark:text-zinc-500">AI drafts: {systemStatus?.services.ai.provider || "checking"}</div>}
            {isSandbox && <button className="secondary-button mt-3 w-full text-xs py-1.5 px-2" disabled={loading} onClick={resetSandbox} type="button"><RefreshCw size={12} />Reset sandbox</button>}
            {isSandbox && <button className="mt-3 w-full text-left text-[11px] font-semibold text-orange-600 dark:text-orange-500 hover:underline" onClick={() => { window.sessionStorage.setItem("flowpilot_skip_sandbox", "1"); logout(); }} type="button">Create your own workspace</button>}
          </div>
        </aside>
        <section className="min-w-0 flex-1 p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-orange-600 dark:text-orange-500">{page}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{({ dashboard: "Operations overview", automations: "Automation status", leads: "Lead inbox", approvals: "Approval queue", templates: "Workflow templates", integrations: "Connected tools", activity: "Activity log", settings: "Workspace settings" })[page]}</h1>
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

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load payment checkout"));
    document.body.appendChild(script);
  });
}

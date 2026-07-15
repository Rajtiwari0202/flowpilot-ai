export type Page = "dashboard" | "automations" | "leads" | "approvals" | "templates" | "integrations" | "activity" | "settings";
export type AuthMode = "signup" | "login" | "forgot";
export type User = { id: string; name: string; email: string; plan: string };
export type Business = { id: string; name: string; type: string; tone: string };
export type WorkflowRow = { id: string; name: string; status: string; runs: number; templateId: string };
export type Lead = { id: string; name: string; email: string | null; phone: string | null; message: string; source: string; status: string; createdAt: string };
export type Approval = { id: string; leadId: string; status: string; draft: string; createdAt: string; lead: Lead | null };
export type Integration = { id: string; provider: string; status: string };
export type ActivityRow = { id: string; label: string; source: string; status: string; createdAt: string; type: string };
export type Template = { id: string; title: string; description: string; category: string; recommended: boolean };
export type SystemStatus = { mode: string; services: { ai: { provider: string; configured: boolean }; billing: { provider: string; configured: boolean }; database: { provider: string; configured: boolean }; leadWebhook: { configured: boolean }; gmail: { configured: boolean }; hubspot: { configured: boolean }; whatsapp: { configured: boolean }; accountEmail: { provider: string; configured: boolean } } };
export type Dashboard = {
  user: User;
  business: Business | null;
  metrics: { activeAutomations: number; leadsProcessedToday: number; pendingApprovals: number; errors: number; timeSavedMinutesThisWeek: number; successRate: number };
  workflows: WorkflowRow[];
  activity: ActivityRow[];
  approvals: Approval[];
};

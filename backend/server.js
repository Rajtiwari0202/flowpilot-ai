const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, "..");
const STORE_PATH = process.env.STORE_PATH || path.join(__dirname, "data", "store.json");
const JWT_SECRET = process.env.JWT_SECRET || "flowpilot-local-dev-secret";

function readStore() {
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash).split(":");
  if (!salt || !hash) return false;
  const stored = Buffer.from(hash, "hex");
  const candidate = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = String(token || "").split(".");
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function send(res, status, payload, headers = {}) {
  const isJson = typeof payload !== "string" && !Buffer.isBuffer(payload);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": process.env.APP_ORIGIN || "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": isJson ? "application/json; charset=utf-8" : headers["Content-Type"] || "text/plain; charset=utf-8",
    ...headers
  });
  res.end(isJson ? JSON.stringify(payload) : payload);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getAuthUser(req, store) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const payload = verifyToken(token);
  return payload ? store.users.find((user) => user.id === payload.sub) : null;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function logActivity(store, item) {
  const row = {
    id: id("act"),
    createdAt: now(),
    status: "success",
    ...item
  };
  store.activity.unshift(row);
  return row;
}

function getUserBusiness(store, userId) {
  return store.businesses.find((business) => business.userId === userId) || null;
}

function dashboardFor(store, user) {
  const business = getUserBusiness(store, user.id);
  const workflows = store.workflows.filter((workflow) => workflow.userId === user.id);
  const leads = store.leads.filter((lead) => lead.userId === user.id);
  const activity = store.activity.filter((item) => item.userId === user.id).slice(0, 10);
  const approvals = store.approvals.filter((approval) => approval.userId === user.id && approval.status === "pending");
  const errors = activity.filter((item) => item.status === "error");
  return {
    user: publicUser(user),
    business,
    metrics: {
      activeAutomations: workflows.filter((workflow) => workflow.status === "active").length,
      leadsProcessedToday: leads.length,
      pendingApprovals: approvals.length,
      errors: errors.length,
      timeSavedMinutesThisWeek: leads.length * 12,
      successRate: activity.length ? Math.round((activity.length - errors.length) / activity.length * 100) : 100
    },
    workflows,
    activity,
    approvals
  };
}

function userRows(store, collection, userId) {
  return store[collection].filter((item) => item.userId === userId);
}

function draftFollowUp({ leadName = "there", businessName = "our team", tone = "professional", message = "" }) {
  const opener = tone === "friendly" ? "Thanks so much for reaching out" : "Thank you for your inquiry";
  const detail = message ? ` I saw your note about "${message.slice(0, 120)}".` : "";
  return `${opener}, ${leadName}.${detail} ${businessName} can help with this. Would you be open to a quick call so we can understand your needs and suggest the best next step?`;
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const store = readStore();

  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true, service: "flowpilot-api", time: now() });

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/flowdesk_full_frontend.html")) {
    const html = fs.readFileSync(path.join(ROOT, "flowdesk_full_frontend.html"));
    return send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await parseBody(req);
    if (!body.email || !body.password || !body.name) return send(res, 400, { error: "name, email, and password are required" });
    if (store.users.some((user) => user.email.toLowerCase() === body.email.toLowerCase())) return send(res, 409, { error: "email already exists" });
    const user = { id: id("usr"), name: body.name, email: body.email.toLowerCase(), passwordHash: hashPassword(body.password), plan: "free", createdAt: now() };
    store.users.push(user);
    logActivity(store, { userId: user.id, type: "user.created", label: "Account created", source: "auth" });
    writeStore(store);
    return send(res, 201, { user: publicUser(user), token: signToken({ sub: user.id }) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const user = store.users.find((candidate) => candidate.email === String(body.email || "").toLowerCase());
    if (!user || !verifyPassword(body.password || "", user.passwordHash)) return send(res, 401, { error: "invalid credentials" });
    return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }) });
  }

  if (req.method === "GET" && url.pathname === "/api/templates") {
    const q = String(url.searchParams.get("q") || "").toLowerCase();
    const templates = store.templates.filter((template) => !q || template.title.toLowerCase().includes(q) || template.description.toLowerCase().includes(q));
    return send(res, 200, { templates });
  }

  const user = getAuthUser(req, store);
  if (url.pathname.startsWith("/api/") && !user) return send(res, 401, { error: "missing or invalid bearer token" });

  if (req.method === "GET" && url.pathname === "/api/me") return send(res, 200, { user: publicUser(user), business: getUserBusiness(store, user.id) });

  if (req.method === "POST" && url.pathname === "/api/onboarding/business") {
    const body = await parseBody(req);
    let business = getUserBusiness(store, user.id);
    if (!business) {
      business = { id: id("biz"), userId: user.id, createdAt: now() };
      store.businesses.push(business);
    }
    Object.assign(business, {
      name: body.name || business.name || "Untitled Business",
      type: body.type || business.type || "other",
      tone: body.tone || business.tone || "professional",
      goals: Array.isArray(body.goals) ? body.goals : business.goals || ["lead_follow_up"],
      updatedAt: now()
    });
    logActivity(store, { userId: user.id, type: "business.updated", label: "Business profile updated", source: "onboarding" });
    writeStore(store);
    return send(res, 200, { business });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") return send(res, 200, dashboardFor(store, user));

  if (req.method === "GET" && url.pathname === "/api/workflows") {
    return send(res, 200, { workflows: userRows(store, "workflows", user.id) });
  }

  if (req.method === "GET" && url.pathname === "/api/leads") {
    return send(res, 200, { leads: userRows(store, "leads", user.id) });
  }

  if (req.method === "GET" && url.pathname === "/api/approvals") {
    const approvals = userRows(store, "approvals", user.id).map((approval) => ({
      ...approval,
      lead: store.leads.find((lead) => lead.id === approval.leadId) || null
    }));
    return send(res, 200, { approvals });
  }

  if (req.method === "GET" && url.pathname === "/api/integrations") {
    return send(res, 200, { integrations: userRows(store, "integrations", user.id) });
  }

  if (req.method === "POST" && url.pathname === "/api/workflows/from-template") {
    const body = await parseBody(req);
    const template = store.templates.find((item) => item.id === body.templateId);
    if (!template) return send(res, 404, { error: "template not found" });
    const workflow = {
      id: id("wf"),
      userId: user.id,
      templateId: template.id,
      name: body.name || template.title,
      status: "active",
      trigger: template.trigger,
      actions: template.actions,
      runs: 0,
      createdAt: now(),
      updatedAt: now()
    };
    store.workflows.push(workflow);
    logActivity(store, { userId: user.id, type: "workflow.created", label: `${workflow.name} activated`, source: "templates" });
    writeStore(store);
    return send(res, 201, { workflow });
  }

  const workflowMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  if (req.method === "PATCH" && workflowMatch) {
    const body = await parseBody(req);
    const workflow = store.workflows.find((item) => item.id === workflowMatch[1] && item.userId === user.id);
    if (!workflow) return send(res, 404, { error: "workflow not found" });
    if (["active", "paused"].includes(body.status)) workflow.status = body.status;
    workflow.updatedAt = now();
    logActivity(store, { userId: user.id, type: "workflow.updated", label: `${workflow.name} ${workflow.status}`, source: "dashboard" });
    writeStore(store);
    return send(res, 200, { workflow });
  }

  if (req.method === "POST" && (url.pathname === "/api/leads" || url.pathname === "/api/webhooks/lead")) {
    const body = await parseBody(req);
    const lead = {
      id: id("lead"),
      userId: user.id,
      name: body.name || "New lead",
      email: body.email || null,
      phone: body.phone || null,
      message: body.message || "",
      source: body.source || "manual",
      status: "new",
      createdAt: now()
    };
    store.leads.unshift(lead);
    const business = getUserBusiness(store, user.id);
    const draft = draftFollowUp({ leadName: lead.name, businessName: business?.name, tone: business?.tone, message: lead.message });
    const approval = { id: id("appr"), userId: user.id, leadId: lead.id, status: "pending", kind: "follow_up_draft", draft, createdAt: now() };
    store.approvals.unshift(approval);
    logActivity(store, { userId: user.id, type: "lead.created", label: `${lead.name} awaiting approval`, source: lead.source, status: "pending" });
    writeStore(store);
    return send(res, 201, { lead, approval });
  }

  if (req.method === "GET" && url.pathname === "/api/activity") {
    return send(res, 200, { activity: store.activity.filter((item) => item.userId === user.id) });
  }

  const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
  if (req.method === "POST" && approvalMatch) {
    const approval = store.approvals.find((item) => item.id === approvalMatch[1] && item.userId === user.id);
    if (!approval) return send(res, 404, { error: "approval not found" });
    const body = await parseBody(req);
    if (typeof body.draft === "string" && body.draft.trim()) approval.draft = body.draft.trim();
    approval.status = approvalMatch[2] === "approve" ? "approved" : "rejected";
    approval.resolvedAt = now();
    const lead = store.leads.find((item) => item.id === approval.leadId);
    if (lead) lead.status = approval.status === "approved" ? "follow_up_sent" : "needs_review";
    if (approval.status === "approved") {
      const workflow = store.workflows.find((item) => item.userId === user.id && item.status === "active");
      if (workflow) workflow.runs += 1;
    }
    logActivity(store, { userId: user.id, type: `approval.${approval.status}`, label: `Draft ${approval.status}`, source: "approvals" });
    writeStore(store);
    return send(res, 200, { approval });
  }

  const integrationMatch = url.pathname.match(/^\/api\/integrations\/([^/]+)\/connect$/);
  if (req.method === "POST" && integrationMatch) {
    const provider = integrationMatch[1];
    let integration = store.integrations.find((item) => item.userId === user.id && item.provider === provider);
    if (!integration) {
      integration = { id: id("int"), userId: user.id, provider, createdAt: now() };
      store.integrations.push(integration);
    }
    integration.status = "connected";
    integration.updatedAt = now();
    logActivity(store, { userId: user.id, type: "integration.connected", label: `${provider} connected`, source: "integrations" });
    writeStore(store);
    return send(res, 200, { integration });
  }

  if (req.method === "POST" && url.pathname === "/api/ai/draft-follow-up") {
    const body = await parseBody(req);
    const business = getUserBusiness(store, user.id);
    return send(res, 200, { draft: draftFollowUp({ ...body, businessName: business?.name, tone: business?.tone }) });
  }

  if (req.method === "POST" && url.pathname === "/api/billing/portal") {
    return send(res, 200, { url: "https://billing.stripe.com/p/session/mock_flowpilot_local" });
  }

  return send(res, 404, { error: "not found" });
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    console.error(error);
    send(res, 500, { error: "internal server error" });
  });
});

server.listen(PORT, () => {
  console.log(`FlowPilot API listening on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. The FlowPilot API may already be running.`);
    process.exit(1);
  }
  throw error;
});

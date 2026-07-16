function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password_hash || u.passwordHash,
    emailVerified: u.email_verified !== undefined ? u.email_verified : u.emailVerified,
    googleId: u.google_id || u.googleId,
    plan: u.plan,
    billing: u.billing,
    createdAt: u.created_at ? new Date(u.created_at).toISOString() : (u.createdAt ? new Date(u.createdAt).toISOString() : null),
    emailVerifiedAt: u.email_verified_at ? new Date(u.email_verified_at).toISOString() : (u.emailVerifiedAt ? new Date(u.emailVerifiedAt).toISOString() : null),
    passwordChangedAt: u.password_changed_at ? new Date(u.password_changed_at).toISOString() : (u.passwordChangedAt ? new Date(u.passwordChangedAt).toISOString() : null)
  };
}

function mapBusiness(b) {
  if (!b) return null;
  return {
    id: b.id,
    userId: b.user_id || b.userId,
    name: b.name,
    type: b.type,
    tone: b.tone,
    goals: b.goals || [],
    createdAt: b.created_at ? new Date(b.created_at).toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : null),
    updatedAt: b.updated_at ? new Date(b.updated_at).toISOString() : (b.updatedAt ? new Date(b.updatedAt).toISOString() : null)
  };
}

function mapIntegration(i) {
  if (!i) return null;
  return {
    id: i.id,
    userId: i.user_id || i.userId,
    provider: i.provider,
    status: i.status,
    encryptedCredentials: i.encrypted_credentials || i.encryptedCredentials,
    encryptionSalt: i.encryption_salt || i.encryptionSalt || null,
    connectedEmail: i.connected_email || i.connectedEmail,
    lastSyncedAt: i.last_synced_at ? new Date(i.last_synced_at).toISOString() : (i.lastSyncedAt ? new Date(i.lastSyncedAt).toISOString() : null),
    createdAt: i.created_at ? new Date(i.created_at).toISOString() : (i.createdAt ? new Date(i.createdAt).toISOString() : null),
    updatedAt: i.updated_at ? new Date(i.updated_at).toISOString() : (i.updatedAt ? new Date(i.updatedAt).toISOString() : null)
  };
}

function mapTemplate(t) {
  if (!t) return null;
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    recommended: t.recommended || false,
    triggerKey: t.trigger_key || t.triggerKey,
    actions: t.actions || []
  };
}

function mapWorkflow(w) {
  if (!w) return null;
  return {
    id: w.id,
    userId: w.user_id || w.userId,
    templateId: w.template_id || w.templateId,
    name: w.name,
    status: w.status,
    triggerKey: w.trigger_key || w.triggerKey,
    actions: w.actions || [],
    runs: w.runs || 0,
    createdAt: w.created_at ? new Date(w.created_at).toISOString() : (w.createdAt ? new Date(w.createdAt).toISOString() : null),
    updatedAt: w.updated_at ? new Date(w.updated_at).toISOString() : (w.updatedAt ? new Date(w.updatedAt).toISOString() : null)
  };
}

function mapLead(l) {
  if (!l) return null;
  return {
    id: l.id,
    userId: l.user_id || l.userId,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    status: l.status,
    notes: l.notes || null,
    tags: Array.isArray(l.tags) ? l.tags : [],
    assignedTo: l.assigned_to || l.assignedTo || null,
    gmailMessageId: l.gmail_message_id || l.gmailMessageId || null,
    createdAt: l.created_at ? new Date(l.created_at).toISOString() : (l.createdAt ? new Date(l.createdAt).toISOString() : null)
  };
}

function mapApproval(a) {
  if (!a) return null;
  return {
    id: a.id,
    userId: a.user_id || a.userId,
    leadId: a.lead_id || a.leadId,
    status: a.status,
    kind: a.kind,
    draft: a.draft,
    aiProvider: a.ai_provider || a.aiProvider,
    deliveryProvider: a.delivery_provider || a.deliveryProvider,
    promptVersion: a.prompt_version || a.promptVersion || null,
    confidence: a.confidence !== undefined && a.confidence !== null ? Number(a.confidence) : null,
    createdAt: a.created_at ? new Date(a.created_at).toISOString() : (a.createdAt ? new Date(a.createdAt).toISOString() : null),
    resolvedAt: a.resolved_at ? new Date(a.resolved_at).toISOString() : (a.resolvedAt ? new Date(a.resolvedAt).toISOString() : null)
  };
}

function mapActivity(ac) {
  if (!ac) return null;
  return {
    id: ac.id,
    userId: ac.user_id || ac.userId,
    type: ac.type,
    label: ac.label,
    source: ac.source,
    status: ac.status,
    createdAt: ac.created_at ? new Date(ac.created_at).toISOString() : (ac.createdAt ? new Date(ac.createdAt).toISOString() : null)
  };
}

function mapAuthToken(at) {
  if (!at) return null;
  return {
    id: at.id,
    userId: at.user_id || at.userId,
    kind: at.kind,
    tokenHash: at.token_hash || at.tokenHash || at.token,
    token: at.token,
    expiresAt: at.expires_at ? new Date(at.expires_at).toISOString() : (at.expiresAt ? new Date(at.expiresAt).toISOString() : null),
    createdAt: at.created_at ? new Date(at.created_at).toISOString() : (at.createdAt ? new Date(at.createdAt).toISOString() : null),
    usedAt: at.used_at ? new Date(at.used_at).toISOString() : (at.usedAt ? new Date(at.usedAt).toISOString() : null)
  };
}

function mapOutbox(o) {
  if (!o) return null;
  return {
    id: o.id,
    userId: o.user_id || o.userId,
    toEmail: o.to_email || o.toEmail || o.to,
    to: o.to || o.to_email || o.toEmail,
    kind: o.kind,
    status: o.status,
    link: o.link,
    createdAt: o.created_at ? new Date(o.created_at).toISOString() : (o.createdAt ? new Date(o.createdAt).toISOString() : null),
    sentAt: o.sent_at ? new Date(o.sent_at).toISOString() : (o.sentAt ? new Date(o.sentAt).toISOString() : null)
  };
}

function mapHistoricalAnalytics(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
    leadsCount: Number(row.leads_count !== undefined ? row.leads_count : (row.leadsCount !== undefined ? row.leadsCount : 0)),
    approvalsCount: Number(row.approvals_count !== undefined ? row.approvals_count : (row.approvalsCount !== undefined ? row.approvalsCount : 0)),
    rejectionsCount: Number(row.rejections_count !== undefined ? row.rejections_count : (row.rejectionsCount !== undefined ? row.rejectionsCount : 0)),
    avgResponseTimeSeconds: Number(row.avg_response_time_seconds !== undefined ? row.avg_response_time_seconds : (row.avgResponseTimeSeconds !== undefined ? row.avgResponseTimeSeconds : 0)),
    timeSavedMinutes: Number(row.time_saved_minutes !== undefined ? row.time_saved_minutes : (row.timeSavedMinutes !== undefined ? row.timeSavedMinutes : 0)),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null)
  };
}

function mapWorkspaceMember(m) {
  if (!m) return null;
  return {
    id: m.id,
    workspaceId: m.workspace_id || m.workspaceId,
    userId: m.user_id || m.userId,
    role: m.role,
    createdAt: m.created_at ? new Date(m.created_at).toISOString() : (m.createdAt ? new Date(m.createdAt).toISOString() : null),
    updatedAt: m.updated_at ? new Date(m.updated_at).toISOString() : (m.updatedAt ? new Date(m.updatedAt).toISOString() : null)
  };
}

function mapGmailSyncState(row) {
  if (!row) return null;
  return {
    workspaceId: row.workspace_id || row.workspaceId,
    lastHistoryId: row.last_history_id || row.lastHistoryId || null,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : (row.lastSyncAt ? new Date(row.lastSyncAt).toISOString() : null),
    processedMessageIds: Array.isArray(row.processed_message_ids || row.processedMessageIds) ? (row.processed_message_ids || row.processedMessageIds) : [],
    processedThreadIds: Array.isArray(row.processed_thread_ids || row.processedThreadIds) ? (row.processed_thread_ids || row.processedThreadIds) : []
  };
}

function mapWorkflowRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    workflowId: row.workflow_id || row.workflowId,
    triggerKey: row.trigger_key || row.triggerKey,
    status: row.status,
    attemptCount: row.attempt_count !== undefined ? Number(row.attempt_count) : (row.attemptCount !== undefined ? Number(row.attemptCount) : 0),
    errorMessage: row.error_message || row.errorMessage || null,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : (row.startedAt ? new Date(row.startedAt).toISOString() : null),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : (row.completedAt ? new Date(row.completedAt).toISOString() : null),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null)
  };
}

function mapApprovalAction(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    approvalId: row.approval_id || row.approvalId,
    actorId: row.actor_id || row.actorId,
    action: row.action,
    notes: row.notes || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null)
  };
}

function mapAuditLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    actorId: row.actor_id || row.actorId || null,
    actorType: row.actor_type || row.actorType || "user",
    entityType: row.entity_type || row.entityType,
    entityId: row.entity_id || row.entityId,
    action: row.action,
    beforeState: row.before_state || row.beforeState || null,
    afterState: row.after_state || row.afterState || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null)
  };
}

function mapNotification(row) {
  if (!row) return null;
  let meta = row.metadata;
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch (e) {
      meta = {};
    }
  }
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    userId: row.user_id || row.userId || null,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read === true || row.read === "true" || row.read === 1 || row.read === "1",
    metadata: meta || {},
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : null)
  };
}

module.exports = {
  mapUser,
  mapBusiness,
  mapIntegration,
  mapTemplate,
  mapWorkflow,
  mapLead,
  mapApproval,
  mapActivity,
  mapAuthToken,
  mapOutbox,
  mapHistoricalAnalytics,
  mapWorkspaceMember,
  mapGmailSyncState,
  mapWorkflowRun,
  mapApprovalAction,
  mapAuditLog,
  mapNotification
};

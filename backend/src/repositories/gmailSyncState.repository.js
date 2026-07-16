const { mapGmailSyncState } = require("./mappers");

const localGmailSyncState = (storePath, seedStorePath, perform) => ({
  async getByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const row = store.gmail_sync_state?.find(s => (s.workspaceId || s.workspace_id) === workspaceId);
    if (!row) {
      return {
        workspaceId,
        lastHistoryId: null,
        lastSyncAt: new Date().toISOString(),
        processedMessageIds: [],
        processedThreadIds: []
      };
    }
    return mapGmailSyncState(row);
  },
  async upsert(workspaceId, values) {
    if (!workspaceId) throw new Error("Workspace context required");
    return perform("gmail_sync_state", (coll) => {
      let row = coll.find(item => (item.workspaceId || item.workspace_id) === workspaceId);
      if (!row) {
        row = {
          workspaceId,
          workspace_id: workspaceId,
          lastHistoryId: null,
          lastSyncAt: new Date().toISOString(),
          processedMessageIds: [],
          processedThreadIds: []
        };
        coll.push(row);
      }
      if (values.lastHistoryId !== undefined) row.lastHistoryId = values.lastHistoryId;
      if (values.processedMessageIds !== undefined) {
        const current = Array.isArray(row.processedMessageIds) ? row.processedMessageIds : [];
        row.processedMessageIds = [...new Set([...current, ...values.processedMessageIds])];
      }
      if (values.processedThreadIds !== undefined) {
        const current = Array.isArray(row.processedThreadIds) ? row.processedThreadIds : [];
        row.processedThreadIds = [...new Set([...current, ...values.processedThreadIds])];
      }
      row.lastSyncAt = new Date().toISOString();
      return mapGmailSyncState(row);
    });
  },
  async hasProcessedMessage(workspaceId, messageId) {
    const row = await this.getByWorkspaceId(workspaceId);
    return row.processedMessageIds?.includes(messageId) || false;
  },
  async markMessagesProcessed(workspaceId, messageIds, threadId) {
    return this.upsert(workspaceId, {
      processedMessageIds: messageIds,
      processedThreadIds: [threadId]
    });
  }
});

const postgresGmailSyncState = (sql, ensureConnection) => ({
  async getByWorkspaceId(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`SELECT * FROM public.gmail_sync_state WHERE workspace_id = ${workspaceId}`;
    if (!rows.length) {
      return {
        workspaceId,
        lastHistoryId: null,
        lastSyncAt: new Date().toISOString(),
        processedMessageIds: [],
        processedThreadIds: []
      };
    }
    return mapGmailSyncState(rows[0]);
  },
  async upsert(workspaceId, values) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const nowStr = new Date().toISOString();
    
    const lastHistoryId = values.lastHistoryId || null;
    const msgIds = values.processedMessageIds || [];
    const threadIds = values.processedThreadIds || [];

    const rows = await sql`
      INSERT INTO public.gmail_sync_state (
        workspace_id, last_history_id, last_sync_at, processed_message_ids, processed_thread_ids
      ) VALUES (
        ${workspaceId}, ${lastHistoryId}, ${nowStr}, ${msgIds}, ${threadIds}
      )
      ON CONFLICT (workspace_id) DO UPDATE SET
        last_history_id = COALESCE(${values.lastHistoryId ?? null}::text, public.gmail_sync_state.last_history_id),
        processed_message_ids = ARRAY(
          SELECT DISTINCT unnest(array_cat(public.gmail_sync_state.processed_message_ids, ${msgIds}::text[]))
        ),
        processed_thread_ids = ARRAY(
          SELECT DISTINCT unnest(array_cat(public.gmail_sync_state.processed_thread_ids, ${threadIds}::text[]))
        ),
        last_sync_at = EXCLUDED.last_sync_at
      RETURNING *
    `;
    return mapGmailSyncState(rows[0]);
  },
  async hasProcessedMessage(workspaceId, messageId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`
      SELECT 1 FROM public.gmail_processed_messages 
      WHERE message_id = ${messageId} AND workspace_id = ${workspaceId}
    `;
    return rows.length > 0;
  },
  async markMessagesProcessed(workspaceId, messageIds, threadId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    for (const msgId of messageIds) {
      await sql`
        INSERT INTO public.gmail_processed_messages (message_id, workspace_id, thread_id, processed_at)
        VALUES (${msgId}, ${workspaceId}, ${threadId}, NOW())
        ON CONFLICT (message_id) DO NOTHING
      `;
    }
    return this.upsert(workspaceId, {
      processedMessageIds: messageIds,
      processedThreadIds: [threadId]
    });
  }
});

module.exports = {
  localGmailSyncState,
  postgresGmailSyncState
};

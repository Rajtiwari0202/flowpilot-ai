const localWorkspaceAiUsage = (storePath, seedStorePath, perform) => ({
  async create(workspaceId, usage) {
    if (!workspaceId) throw new Error("Workspace context required");
    const { id } = require("../utils/helpers");
    const newRecord = {
      id: usage.id || id("usg"),
      workspaceId,
      workspace_id: workspaceId,
      model: usage.model,
      provider: usage.provider || "groq",
      promptTokens: usage.promptTokens || usage.prompt_tokens || 0,
      completionTokens: usage.completionTokens || usage.completion_tokens || 0,
      totalTokens: usage.totalTokens || usage.total_tokens || 0,
      requestCount: usage.requestCount || usage.request_count || 1,
      createdAt: usage.createdAt || usage.created_at || new Date().toISOString()
    };
    await perform("workspace_ai_usage", (coll) => coll.push(newRecord));
    return newRecord;
  },
  async getSummary(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    const fs = require("fs");
    if (!fs.existsSync(storePath)) {
      fs.copyFileSync(seedStorePath, storePath);
    }
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    const records = (store.workspace_ai_usage || []).filter(u => (u.workspaceId || u.workspace_id) === workspaceId);
    
    return records.reduce((acc, r) => {
      acc.promptTokens += (r.promptTokens || r.prompt_tokens || 0);
      acc.completionTokens += (r.completionTokens || r.completion_tokens || 0);
      acc.totalTokens += (r.totalTokens || r.total_tokens || 0);
      acc.requestCount += (r.requestCount || r.request_count || 1);
      return acc;
    }, { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 });
  }
});

const postgresWorkspaceAiUsage = (sql, ensureConnection) => ({
  async create(workspaceId, usage) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const { id } = require("../utils/helpers");
    const newId = usage.id || id("usg");
    const provider = usage.provider || "groq";
    const promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
    const completionTokens = usage.completionTokens || usage.completion_tokens || 0;
    const totalTokens = usage.totalTokens || usage.total_tokens || 0;
    const requestCount = usage.requestCount || usage.request_count || 1;
    const createdAt = usage.createdAt || usage.created_at || new Date().toISOString();

    await sql`
      INSERT INTO public.workspace_ai_usage (
        id, workspace_id, model, provider, prompt_tokens, completion_tokens, total_tokens, request_count, created_at
      ) VALUES (
        ${newId}, ${workspaceId}, ${usage.model}, ${provider}, ${promptTokens}, ${completionTokens}, ${totalTokens}, ${requestCount}, ${createdAt}
      )
    `;
    return {
      id: newId,
      workspaceId,
      model: usage.model,
      provider,
      promptTokens,
      completionTokens,
      totalTokens,
      requestCount,
      createdAt
    };
  },
  async getSummary(workspaceId) {
    if (!workspaceId) throw new Error("Workspace context required");
    await ensureConnection();
    const rows = await sql`
      SELECT 
        COALESCE(SUM(prompt_tokens), 0)::integer as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0)::integer as completion_tokens,
        COALESCE(SUM(total_tokens), 0)::integer as total_tokens,
        COALESCE(SUM(request_count), 0)::integer as request_count
      FROM public.workspace_ai_usage
      WHERE workspace_id = ${workspaceId}
    `;
    if (!rows.length) {
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 };
    }
    return {
      promptTokens: rows[0].prompt_tokens,
      completionTokens: rows[0].completion_tokens,
      totalTokens: rows[0].total_tokens,
      requestCount: rows[0].request_count
    };
  }
});

module.exports = {
  localWorkspaceAiUsage,
  postgresWorkspaceAiUsage
};

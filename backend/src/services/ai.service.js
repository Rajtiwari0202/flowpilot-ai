const { GROQ_MODEL } = require("../config/env");

const PROMPT_VERSION = "v1";

function sanitizeUserInput(text) {
  if (typeof text !== "string") return "No inquiry details provided.";
  let clean = text.trim();
  // Strip common prompt injection control words
  clean = clean.replace(/ignore\s+(?:all\s+)?previous\s+instructions/gi, "[REDACTED INJECTION ATTEMPT]");
  clean = clean.replace(/ignore\s+(?:all\s+)?prior\s+instructions/gi, "[REDACTED INJECTION ATTEMPT]");
  clean = clean.replace(/system\s+prompt/gi, "[REDACTED]");
  clean = clean.replace(/you\s+are\s+now\s+an\s+AI/gi, "[REDACTED]");
  // Enforce 2,000 character maximum ceiling length
  if (clean.length > 2000) {
    clean = clean.substring(0, 2000) + "... [truncated]";
  }
  return clean || "No inquiry details provided.";
}

function fallbackDraftFollowUp({ leadName = "there", businessName = "our team", tone = "professional", message = "" }) {
  const opener = tone === "friendly" ? "Thanks so much for reaching out" : "Thank you for your inquiry";
  const detail = message ? ` I saw your note about "${message.slice(0, 120)}".` : "";
  return `${opener}, ${leadName}.${detail} ${businessName} can help with this. Would you be open to a quick call so we can understand your needs and suggest the best next step?`;
}

function localRuleBasedAnalysis(input) {
  const message = sanitizeUserInput(input.message).toLowerCase();
  
  let category = "sales";
  let intent = "general inquiry";
  let priority = "medium";
  
  if (message.includes("price") || message.includes("cost") || message.includes("pricing") || message.includes("quote") || message.includes("how much")) {
    intent = "pricing inquiry";
    priority = "high";
  } else if (message.includes("demo") || message.includes("trial") || message.includes("walkthrough") || message.includes("see the product")) {
    intent = "demo request";
  } else if (message.includes("help") || message.includes("support") || message.includes("bug") || message.includes("issue") || message.includes("broken")) {
    category = "support";
    intent = "technical support";
  } else if (message.includes("bill") || message.includes("invoice") || message.includes("charge") || message.includes("payment")) {
    category = "billing";
    intent = "billing question";
  }
  
  if (message.includes("urgent") || message.includes("asap") || message.includes("now") || message.includes("immediately") || message.includes("emergency")) {
    priority = "high";
  }

  const leadName = input.leadName || "Lead";
  const summary = message ? `Inquiry from ${leadName}: "${input.message.slice(0, 50)}..."` : `General contact request from ${leadName}`;
  const draft = fallbackDraftFollowUp(input);

  return {
    category,
    intent,
    priority,
    confidence: 0.70,
    summary,
    draft,
    prompt_version: PROMPT_VERSION,
    provider: "local_fallback"
  };
}

async function analyzeLeadAndGenerate(workspaceId, input) {
  if (!workspaceId) throw new Error("Workspace context required");

  // If Groq key is missing, immediately use template generator fallback
  if (!process.env.GROQ_API_KEY) {
    return localRuleBasedAnalysis(input);
  }

  const prompt = [
    `Analyze the incoming lead message and generate a structured JSON analysis along with a concise follow-up email draft.`,
    `Business Name: ${input.businessName || "our team"}`,
    `Business Tone: ${input.tone || "professional"}`,
    `Lead Name: ${input.leadName || "there"}`,
    `Lead Message: ${sanitizeUserInput(input.message)}`,
    `Response JSON schema format:`,
    `{`,
    `  "category": "sales | support | billing | general",`,
    `  "intent": "pricing inquiry | demo request | technical support | signup help | general inquiry",`,
    `  "priority": "high | medium | low",`,
    `  "confidence": 0.0 to 1.0 (float value),`,
    `  "summary": "a short 1-sentence summary of the lead's inquiry",`,
    `  "draft": "concise follow-up email text, under 140 words, suggesting a quick call as the next step"`,
    `}`,
    `Important: Return ONLY a valid JSON string. Do not wrap the JSON output in markdown block backticks.`
  ].join("\n");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are an AI assistant that analyzes sales leads and outputs structured JSON conforming to schemas. Always return valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_completion_tokens: 400
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Groq returned empty content");

    const parsed = JSON.parse(content);
    
    // Explicit Schema Verification
    const validCategories = ["sales", "support", "billing", "general"];
    const validPriorities = ["high", "medium", "low"];
    
    const category = validCategories.includes(parsed.category) ? parsed.category : "sales";
    const priority = validPriorities.includes(parsed.priority) ? parsed.priority : "medium";
    const intent = typeof parsed.intent === "string" ? parsed.intent : "general inquiry";
    const confidence = (typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1) ? parsed.confidence : 0.90;
    const summary = typeof parsed.summary === "string" ? parsed.summary : `Inquiry from ${input.leadName || "Lead"}`;
    const draft = typeof parsed.draft === "string" ? parsed.draft : fallbackDraftFollowUp(input);

    // Track usage in workspace stats
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;
    
    const { repository } = require("../app");
    try {
      await repository.workspaceAiUsage.create(workspaceId, {
        model: GROQ_MODEL,
        provider: "groq",
        promptTokens,
        completionTokens,
        totalTokens
      });
    } catch (dbErr) {
      console.error("Failed to persist workspace AI usage metrics:", dbErr.message);
    }

    return {
      category,
      intent,
      priority,
      confidence,
      summary,
      draft,
      prompt_version: PROMPT_VERSION,
      provider: "groq"
    };

  } catch (error) {
    console.error("Groq generation failed, invoking template fallback:", error.message);
    return localRuleBasedAnalysis(input);
  }
}

module.exports = {
  PROMPT_VERSION,
  fallbackDraftFollowUp,
  localRuleBasedAnalysis,
  analyzeLeadAndGenerate
};

import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { secrets } from "base44:runtime";

/**
 * Base44-side proxy for MpesaTrack's Supabase Edge Functions.
 *
 * Supabase cannot use Base44's service role or aiGateway.connection() from
 * outside a Base44 backend function. This endpoint owns that connection and
 * returns the model's JSON object to the caller.
 *
 * Deploy to a Base44 backend project, then set:
 *   MPESA_TRACK_PROXY_SECRET=<shared secret>
 *
 * Supabase secrets:
 *   BASE44_LLM_FUNCTION_URL=https://<app-domain>/functions/llm-complete-json
 *   BASE44_LLM_SECRET=<same shared secret>
 *   BASE44_LLM_MODEL=automatic            # optional; Base44 preset id
 */

const DEFAULT_MODEL = "automatic";
const MAX_PROMPT_CHARS = 100_000;
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 60_000;

function firstText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content
    ?? payload?.choices?.[0]?.message?.reasoning_content
    ?? "";
  if (typeof content === "string") return content;
  try { return JSON.stringify(content); } catch { return String(content); }
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

function parseJsonResponse(text: string): Record<string, any> {
  const cleaned = stripFences(text);

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : { reply: cleaned, proposed_actions: [] };
  } catch {
    // Some models wrap JSON in a short sentence; rescue the object.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch { /* fall through */ }
    }
    return { reply: cleaned, proposed_actions: [] };
  }
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const expectedSecret = secrets.get("MPESA_TRACK_PROXY_SECRET");
  if (!expectedSecret) {
    return Response.json({ error: "MPESA_TRACK_PROXY_SECRET is not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (providedSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const startedAt = Date.now();
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return Response.json({ error: "A prompt is required" }, { status: 400 });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return Response.json({ error: "Prompt is too long" }, { status: 400 });
  }

  // Cost-driving settings stay in Base44; callers cannot choose a model.
  const model = (secrets.get("BASE44_LLM_MODEL") || DEFAULT_MODEL).trim().slice(0, 100);

  try {
    const base44 = createClientFromRequest(req);
    const connection = base44.asServiceRole.aiGateway.connection();
    const baseURL = String(connection.baseURL || "").replace(/\/+$/, "");
    if (!baseURL || !connection.token) {
      throw new Error("Base44 AI Gateway connection is unavailable");
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(connection.headers || {}),
        Authorization: `Bearer ${connection.token}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You reply only with a single valid JSON object. No prose, no markdown, no code fences.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const upstream = await response.json().catch(() => ({}));
      const message = upstream?.error?.message || upstream?.message
        || `Base44 AI Gateway request failed (${response.status})`;
      return Response.json({ error: String(message) }, { status: 502 });
    }

    const payload = await response.json().catch(() => ({}));
    const text = firstText(payload);
    if (!text.trim()) {
      return Response.json({ error: "Base44 LLM returned an empty response" }, { status: 502 });
    }

    console.log("llm-complete-json responded in", Date.now() - startedAt, "ms with", model);
    return Response.json({ result: parseJsonResponse(text), model });
  } catch (error: any) {
    console.error("llm-complete-json failed after", Date.now() - startedAt, "ms:", error);
    return Response.json({ error: error?.message || "Base44 LLM request failed" }, { status: 500 });
  }
}

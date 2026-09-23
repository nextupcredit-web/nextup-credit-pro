// Supabase Edge Function (Deno). Secrets: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (set in Supabase, never in the app).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPrompt, checkCustom, validateOutput, underCap } from "../_shared/lib.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await sb.auth.getUser(); if (!u?.user) return json({ error: "sign in required" }, 401);
  const { client_id, round = 1 } = await req.json();
  // RLS guarantees the caller can only read accounts of clients they may see.
  const { data: accts, error } = await sb.from("accounts").select("*").eq("client_id", client_id).eq("decision", "dispute");
  if (error || !accts?.length) return json({ error: "no accounts selected" }, 400);
  const out = [];
  for (const a of accts) {
    if (a.method === "custom") { const c = checkCustom(a.custom_reason ?? ""); if (!c.ok) return json({ error: c.problem, account: a.id }, 422); }
    const { system, user } = buildPrompt({ id: a.id, creditor: a.creditor, acct_type: a.acct_type, last4: a.acct_last4, bureau: a.bureau, method: a.method, custom_reason: a.custom_reason, facts: a.reason }, round);
    let text = "";
    for (let tries = 0; tries < 2 && !text; tries++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5", max_tokens: 400, system, messages: [{ role: "user", content: user }] }) });
      if (!r.ok) return json({ error: "AI service error" }, 502);
      const d = await r.json(); const t = d.content?.[0]?.text ?? "";
      if (validateOutput(t).ok) text = t.trim();
      await sb.from("api_usage").insert({ client_id, kind: "draft", tokens_in: d.usage?.input_tokens, tokens_out: d.usage?.output_tokens });
    }
    out.push({ account_id: a.id, bureau: a.bureau, text: text || null, needs_review: !text });
  }
  return json({ items: out });
});

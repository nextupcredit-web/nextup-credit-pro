// Pure, testable logic shared by edge functions. No secrets here.
export const FORBIDDEN = /\b(sue|sued|lawsuit|attorney|lawyer|threat\w*|fdcpa|ucc|respa|subpoena|court|illegal|fraud)\b|\bv\.\s|\bF\.?\s?(2d|3d|supp)\b/i;
export const ALLOWED_SECTIONS = ["605","605A","605B","607(b)","609","611","612","623"];
export const ROUND_STYLE: Record<number,string> = {
  1: "Plain and polite. Cite no law. Ask them to look at the item again against my file.",
  2: "Direct instruction to investigate and correct or delete anything not accurate and complete.",
  3: "Ask for the method of verification: who was contacted and what records were relied on. Cite FCRA only where it applies.",
  4: "Firm, factual, no threats.", 5: "Firm, factual, no threats. Reference earlier rounds by date.",
  6: "Ask that the 'in dispute' notation be removed and that the report show the true status.",
};
export type Acct = { id:string; creditor:string; acct_type:string; last4:string; bureau:string; balance?:number; method:"ours"|"custom"; custom_reason?:string; facts?:string };

export function checkCustom(text: string): {ok:boolean; problem?:string} {
  const t=(text||"").trim();
  if (t.length<10) return {ok:false, problem:"Please say what is wrong and what you want done."};
  if (t.length>1000) return {ok:false, problem:"Please keep it under 1000 characters."};
  const m=t.match(FORBIDDEN);
  if (m) return {ok:false, problem:`"${m[0]}" is not allowed. Letters use consumer law and facts only, with no threats or outside legal claims.`};
  return {ok:true};
}

export function buildPrompt(a: Acct, round: number, priorPhrases: string[] = []): {system:string; user:string} {
  const system = [
    "You write one short paragraph for a consumer credit dispute letter, in the consumer's first-person voice.",
    "Rules: use ONLY the facts provided. Never invent facts, dates, amounts or account numbers. Consumer law and factual disputing only.",
    "You may refer only to the Fair Credit Reporting Act sections: "+ALLOWED_SECTIONS.join(", ")+". No threats. No mention of lawsuits, attorneys, courts, FDCPA, UCC, RESPA or cases.",
    "Never claim the account is fraud or identity theft unless the facts say so. Output the paragraph only.",
    "Round guidance: "+(ROUND_STYLE[round]||ROUND_STYLE[4]),
    priorPhrases.length? "Do not reuse these earlier phrasings: "+priorPhrases.join(" | "):"",
  ].filter(Boolean).join("\n");
  const src = a.method==="custom"
    ? `The consumer's own reason and instruction (follow it, rewrite it clearly and politely, do not add claims they did not make): """${(a.custom_reason||"").trim()}"""`
    : `Facts from the report: ${a.facts||"(none given)"}`;
  return { system, user:`Account: ${a.creditor}, ${a.acct_type}, ending ${a.last4}, bureau ${a.bureau}.\n${src}` };
}

export function validateOutput(text: string): {ok:boolean; problem?:string} {
  if (!text||text.trim().length<20) return {ok:false, problem:"empty"};
  const m=text.match(FORBIDDEN); if (m) return {ok:false, problem:"forbidden: "+m[0]};
  const secs=[...text.matchAll(/section\s+(\d{3}[A-B]?(?:\([a-z0-9]+\))?)/gi)].map(x=>x[1]);
  for (const s of secs) if (!ALLOWED_SECTIONS.includes(s.toUpperCase().replace(/\(([A-Z])\)/,(_,c)=>`(${c.toLowerCase()})`)) && !ALLOWED_SECTIONS.some(a=>s.startsWith(a))) return {ok:false, problem:"section not allowed: "+s};
  return {ok:true};
}

export function underCap(usedThisMonth: number, cap=2) { return usedThisMonth < cap; }

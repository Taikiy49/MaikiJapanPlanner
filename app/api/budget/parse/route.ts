import { generateText } from "ai";
import { BudgetData, emptyBudget } from "@/lib/budget";

const aliases = [{ id: "rent", words: ["rent"] }, { id: "car-loan", words: ["car loan", "car payment", "auto loan"] }, { id: "savings", words: ["savings account", "savings", "save"] }];
function localParse(text: string, current: BudgetData) {
  const next = structuredClone(current || emptyBudget()), find = (words: string[]) => {
    for (const word of words) { const match = text.match(new RegExp(`${word}[^\\d$]{0,18}\\$?([\\d,]+(?:\\.\\d{1,2})?)`, "i")); if (match) return Number(match[1].replaceAll(",", "")); }
  };
  const paycheck = find(["paycheck", "pay check", "income", "take home"]); if (paycheck !== undefined) next.paycheck = paycheck;
  for (const alias of aliases) { const amount = find(alias.words); if (amount !== undefined) next.items = next.items.map((item) => item.id === alias.id ? { ...item, amount } : item); }
  return next;
}
export async function POST(request: Request) {
  const { text, current } = await request.json();
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "Describe the budget values to update." }, { status: 400 });
  const fallback = localParse(text, current || emptyBudget());
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) return Response.json({ budget: fallback, source: "local" });
  try {
    const { text: result } = await generateText({ model: "openai/gpt-5.6-luna", system: "Extract a personal monthly budget update. Return only JSON with optional paycheck number and items array of {name,amount,kind:'bill'|'saving',recurring}. Never invent values.", prompt: text });
    const parsed = JSON.parse(result.replace(/^```json|```$/g, "").trim());
    const budget = structuredClone(current || emptyBudget()); if (Number.isFinite(parsed.paycheck)) budget.paycheck = parsed.paycheck;
    for (const item of Array.isArray(parsed.items) ? parsed.items : []) { const existing = budget.items.find((entry: { name: string }) => entry.name.toLowerCase() === String(item.name).toLowerCase()); if (existing) Object.assign(existing, item); else budget.items.push({ id: crypto.randomUUID(), name: String(item.name), amount: Number(item.amount)||0, kind: item.kind === "saving" ? "saving" : "bill", recurring: item.recurring !== false }); }
    return Response.json({ budget, source: "ai" });
  } catch { return Response.json({ budget: fallback, source: "local" }); }
}

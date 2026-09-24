"use client";
import { useMemo, useState } from "react";
import { Bot, CalendarPlus, CirclePlus, DollarSign, LineChart, PiggyBank, ReceiptText, Trash2, WalletCards } from "lucide-react";
import { BudgetData, BudgetItem, budgetTotals, recordBudgetMonth } from "@/lib/budget";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Budget({ value, onChange }: { value: BudgetData; onChange: (next: BudgetData) => void }) {
  const [month, setMonth] = useState(currentMonth), [prompt, setPrompt] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const totals = useMemo(() => budgetTotals(value), [value]);
  const updateItem = (id: string, patch: Partial<BudgetItem>) => onChange({ ...value, items: value.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const addItem = () => onChange({ ...value, items: [...value.items, { id: crypto.randomUUID(), name: "New expense", amount: 0, recurring: false, kind: "bill" }] });
  const record = () => { onChange(recordBudgetMonth(value, month)); setMessage(`${month} saved to your monthly history.`); };
  async function smartAdd() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/budget/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: prompt, current: value }) });
      const data = await response.json();
      if (!response.ok || !data.budget) throw new Error();
      onChange(data.budget); setPrompt(""); setMessage("Budget updated from your message. Review the values before recording the month.");
    } catch { setMessage("I couldn’t understand that. Try: Paycheck 4200, rent 1600, car 450, savings 600."); }
    finally { setBusy(false); }
  }
  return <div className="page budget-page">
    <section className="budget-ledger">
      <div><h1>Mia Budget</h1></div>
      <div className="paycheck-field"><label htmlFor="budget-paycheck">Monthly paycheck</label><div><DollarSign size={20}/><input id="budget-paycheck" aria-label="Monthly paycheck" type="number" min="0" step="0.01" value={value.paycheck || ""} onChange={(e) => onChange({ ...value, paycheck: Number(e.target.value) })}/></div><Recurring checked={value.paycheckRecurring} onChange={(checked) => onChange({ ...value, paycheckRecurring: checked })}/></div>
      <div className={`remaining-number ${totals.remaining < 0 ? "negative" : ""}`}><span>Remaining</span><b>{money(totals.remaining)}</b>{totals.remaining < 0 && <small>Over budget</small>}</div>
    </section>

    <section className="budget-summary" aria-label="Budget summary">
      <Metric icon={<ReceiptText/>} label="Bills" value={money(totals.bills)}/><Metric icon={<PiggyBank/>} label="To savings" value={money(totals.saved)}/><Metric icon={<WalletCards/>} label="Total committed" value={money(totals.committed)}/>
    </section>

    <section className="budget-grid">
      <div className="card commitments-card"><header><h2>Commitments</h2><button className="soft" aria-label="Add commitment" title="Add commitment" onClick={addItem}><CirclePlus size={18}/></button></header>
        <div className="commitment-list">{value.items.map((item) => <div className="commitment-row" key={item.id}>
          <input aria-label="Commitment name" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })}/>
          <select aria-label={`${item.name} type`} value={item.kind} onChange={(e) => updateItem(item.id, { kind: e.target.value as BudgetItem["kind"] })}><option value="bill">Bill</option><option value="saving">Savings</option></select>
          <label className="money-input"><DollarSign size={14}/><input aria-label={`${item.name} amount`} type="number" min="0" step="0.01" value={item.amount || ""} onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) })}/></label>
          <Recurring checked={item.recurring} onChange={(recurring) => updateItem(item.id, { recurring })}/>
          <button className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => onChange({ ...value, items: value.items.filter((entry) => entry.id !== item.id) })}><Trash2 size={15}/></button>
        </div>)}</div>
        <footer><label>Month<input aria-label="Budget month" type="month" value={month} onChange={(e) => setMonth(e.target.value)}/></label><button className="primary" onClick={record}><CalendarPlus size={16}/> Record month</button></footer>
      </div>

      <div className="card budget-ai"><header><Bot size={20}/><h2>Quick entry</h2></header><textarea className="resize-none" aria-label="Describe your budget" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Paycheck $4,200, rent $1,600, car $450, savings $600…"/><button className="primary" disabled={busy || !prompt.trim()} onClick={smartAdd}>{busy ? "Reading…" : "Apply"}</button>{message && <div className="budget-message" role="status">{message}</div>}</div>
    </section>

    <section className="card budget-history"><header><h2>Monthly trends</h2><LineChart size={20}/></header>{value.months.length ? <BudgetChart months={value.months}/> : <div className="budget-empty"><LineChart size={28}/><p>Record a month to see your trends.</p></div>}</section>
  </div>;
}

function Recurring({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <label className="recurring"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/><span>Recurring</span></label>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div><i>{icon}</i><span><small>{label}</small><b>{value}</b></span></div>; }
function BudgetChart({ months }: { months: BudgetData["months"] }) {
  const max = Math.max(1, ...months.flatMap((item) => [item.bills, item.saved, Math.max(0, item.remaining)]));
  return <div className="budget-chart"><div className="chart-legend"><span className="bills">Bills</span><span className="saved">Saved</span><span className="remaining">Remaining</span></div><div className="chart-bars">{months.map((item) => <div className="chart-month" key={item.month}><div className="bar-stack"><i className="remaining" style={{ height: `${Math.max(3, Math.max(0,item.remaining)/max*100)}%` }} title={`Remaining ${money(item.remaining)}`}/><i className="saved" style={{ height: `${Math.max(3,item.saved/max*100)}%` }} title={`Saved ${money(item.saved)}`}/><i className="bills" style={{ height: `${Math.max(3,item.bills/max*100)}%` }} title={`Bills ${money(item.bills)}`}/></div><b>{new Date(`${item.month}-02`).toLocaleDateString("en-US", { month: "short" })}</b><small>{money(item.remaining)} left</small></div>)}</div></div>;
}

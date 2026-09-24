export type BudgetItem = { id: string; name: string; amount: number; recurring: boolean; kind: "bill" | "saving" };
export type BudgetMonth = { month: string; paycheck: number; bills: number; saved: number; remaining: number };
export type BudgetData = { paycheck: number; paycheckRecurring: boolean; items: BudgetItem[]; months: BudgetMonth[] };

export const emptyBudget = (): BudgetData => ({
  paycheck: 0,
  paycheckRecurring: true,
  items: [
    { id: "rent", name: "Rent", amount: 0, recurring: true, kind: "bill" },
    { id: "car-loan", name: "Car loan", amount: 0, recurring: true, kind: "bill" },
    { id: "savings", name: "Savings account", amount: 0, recurring: true, kind: "saving" },
  ],
  months: [],
});

export function budgetTotals(data: BudgetData) {
  const bills = data.items.filter((item) => item.kind === "bill").reduce((sum, item) => sum + item.amount, 0);
  const saved = data.items.filter((item) => item.kind === "saving").reduce((sum, item) => sum + item.amount, 0);
  return { bills, saved, committed: bills + saved, remaining: data.paycheck - bills - saved };
}

export function recordBudgetMonth(data: BudgetData, month: string): BudgetData {
  const totals = budgetTotals(data);
  const snapshot = { month, paycheck: data.paycheck, bills: totals.bills, saved: totals.saved, remaining: totals.remaining };
  return {
    paycheck: data.paycheckRecurring ? data.paycheck : 0,
    paycheckRecurring: data.paycheckRecurring,
    items: data.items.map((item) => item.recurring ? item : { ...item, amount: 0 }),
    months: [...data.months.filter((item) => item.month !== month), snapshot].sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
  };
}

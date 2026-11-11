import test from "node:test"; import assert from "node:assert/strict";
import { budgetTotals, emptyBudget, recordBudgetMonth } from "../lib/budget.ts";
test("calculates paycheck less rent, car, and savings", () => { const data=emptyBudget(); data.paycheck=4200; data.items[0].amount=1600; data.items[1].amount=450; data.items[2].amount=600; assert.deepEqual(budgetTotals(data),{bills:2050,saved:600,committed:2650,remaining:1550}); });
test("records one month and clears only non-recurring values", () => { const data=emptyBudget(); data.paycheck=3000; data.items.push({id:"once",name:"Repair",amount:250,recurring:false,kind:"bill"}); const next=recordBudgetMonth(data,"2026-09"); assert.equal(next.months[0].remaining,2750); assert.equal(next.items.at(-1)?.amount,0); assert.equal(next.paycheck,3000); });

test("monthly snapshot preserves every entry before recurring values reset", () => {
  const data = emptyBudget();
  data.paycheck = 4200;
  data.paycheckRecurring = false;
  data.items[0].amount = 1600;
  data.items.push({ id: "repair", name: "Repair", amount: 250, kind: "bill", recurring: false });
  const next = recordBudgetMonth(data, "2026-11");
  const saved = JSON.parse(JSON.stringify(next)).months[0];
  assert.equal(saved.paycheck, 4200);
  assert.equal(saved.paycheckRecurring, false);
  assert.deepEqual(saved.items, data.items);
  assert.equal(next.paycheck, 0);
  assert.equal(next.items.at(-1)?.amount, 0);
  data.items[0].name = "Changed";
  next.items[0].amount = 999;
  assert.equal(next.months[0].items?.[0].name, "Rent");
  assert.equal(next.months[0].items?.[0].amount, 1600);
});

test("keeps older totals and more than twelve months while replacing only the selected month", () => {
  let data = emptyBudget();
  data.months = [{ month: "2025-01", paycheck: 100, bills: 20, saved: 30, remaining: 50 }];
  for (let month = 1; month <= 12; month++) data = recordBudgetMonth(data, `2026-${String(month).padStart(2, "0")}`);
  assert.equal(data.months.length, 13);
  assert.equal(data.months[0].items, undefined);
  data.paycheck = 5000;
  const updated = recordBudgetMonth(data, "2026-12");
  assert.equal(updated.months.length, 13);
  assert.equal(updated.months.at(-1)?.paycheck, 5000);
  assert.deepEqual(updated.months[0], data.months[0]);
});

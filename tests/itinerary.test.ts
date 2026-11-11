import test from "node:test";
import assert from "node:assert/strict";
import { itineraryDates } from "../lib/itinerary.ts";

test("includes every trip date, including arrival, empty days, and departure", () => {
  const days = itineraryDates(["2026-12-28", "2026-12-18", "2026-12-18", "2026-12-25"]);
  assert.equal(days.length, 11);
  assert.equal(days[0], "2026-12-18");
  assert.equal(days.at(-1), "2026-12-28");
  assert.ok(days.includes("2026-12-21"));
  assert.ok(days.includes("2026-12-27"));
});
test("handles leap days, year boundaries, and daylight-saving changes", () => {
  assert.deepEqual(itineraryDates(["2028-02-28", "2028-03-01"]), ["2028-02-28", "2028-02-29", "2028-03-01"]);
  assert.deepEqual(itineraryDates(["2026-12-31", "2027-01-02"]), ["2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.deepEqual(itineraryDates(["2026-03-07", "2026-03-09"]), ["2026-03-07", "2026-03-08", "2026-03-09"]);
});
test("handles empty, single-day, and invalid dates", () => {
  assert.deepEqual(itineraryDates([]), []);
  assert.deepEqual(itineraryDates(["", "invalid", "2026-02-30", "2026-12-18"]), ["2026-12-18"]);
});

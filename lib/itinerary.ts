// Use UTC calendar arithmetic so daylight-saving changes cannot skip a day.
export function itineraryDates(dates: string[]): string[] {
  const valid = [...new Set(dates)].filter((date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + "T00:00:00Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }).sort();
  if (!valid.length) return [];
  const day = new Date(valid[0] + "T00:00:00Z");
  const last = valid[valid.length - 1];
  const result: string[] = [];
  while (day.toISOString().slice(0, 10) <= last) {
    result.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return result;
}

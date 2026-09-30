"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Budget from "./budget";
import Notes from "./notes";
import { BudgetData, emptyBudget } from "@/lib/budget";
import {
  AlertTriangle, BadgeDollarSign, CalendarDays, CirclePlus, Compass, ExternalLink, Hotel as HotelIcon,
  Car, Check, NotebookPen, ClipboardList, DollarSign, Download, Luggage, Pencil, Plane, Printer, Redo2, Search, ShoppingBag,
  Sparkles, Tickets, TrainFront, Trash2, Undo2, UserRound, Users, Utensils, WalletCards, WandSparkles, X,
} from "lucide-react";

type Person = { id: number; name: string; color: string };
type Expense = {
  id: number;
  name: string;
  category: string;
  amount: number;
  paidBy: number;
  splitWith: number[];
  date: string;
  notes?: string;
};
type Plan = {
  id: number;
  date: string;
  title: string;
  place: string;
  type: "Activity" | "Travel" | "Food";
  time: string;
  done?: boolean;
  mapUrl?: string;
};
type Payment = { from: Person; to: Person; amount: number };
type Reservation = {
  id: number;
  kind: "Flight" | "Hotel" | "Dining" | "Tickets" | "Transport" | "Other";
  title: string;
  date: string;
  time: string;
  confirmation: string;
  location: string;
  flightNumber?: string;
  arrivalTime?: string;
};
type Decision = {
  id: number;
  question: string;
  options: Array<{ label: string; votes: number }>;
};
type TripLink = { id: number; label: string; url: string };
type PackingItem = { id: string; text: string; ownerId: number };
type AuditEntry = { id: string; at: number; category: "Itinerary" | "Expense" | "Traveler" | "Packing" | "Trip"; action: string; detail: string; actor: string };
type EditTarget =
  | { type: "plan"; item: Plan }
  | { type: "reservation"; item: Reservation }
  | { type: "expense"; item: Expense }
  | { type: "packing"; item: PackingItem }
  | { type: "link"; item: TripLink }
  | { type: "person"; item: Person };
type ConfirmAction = { type: "trip" } | { type: "person"; item: Person };
type CalendarView = "month" | "week" | "agenda";
type SharedPlannerState = {
  tripName: string;
  plans: Plan[];
  people: Person[];
  expenses: Expense[];
  reservations: Reservation[];
  decisions: Decision[];
  tripLinks: TripLink[];
  tripNotes: string;
  packing: PackingItem[];
  packed: string[];
  timezone: string;
  auditLog?: AuditEntry[];
};
type TripRecord = SharedPlannerState & { id: string; createdAt: number };
type PlannerState = { version: 2; activeTripId: string; trips: TripRecord[]; budget?: BudgetData };
const palette = [
  "#3975ad",
  "#6b9dcc",
  "#244f7d",
  "#83add3",
  "#4f86bb",
  "#9abddd",
];
const timezones = [
  ["Pacific/Honolulu", "Honolulu"],
  ["America/Los_Angeles", "Los Angeles"],
  ["America/Denver", "Denver"],
  ["America/Chicago", "Chicago"],
  ["America/New_York", "New York"],
  ["Europe/London", "London"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
] as const;
const testIdeas: Array<[string, string, Plan["type"], string]> = [
  ["Flight and hotel check-in", "Las Vegas", "Travel", "3:00 PM"],
  ["Welcome dinner", "The Strip", "Food", "7:00 PM"],
  ["Pool morning", "Resort", "Activity", "9:00 AM"],
  ["Neon Museum", "Downtown Las Vegas", "Activity", "6:00 PM"],
  ["Brunch with the group", "Arts District", "Food", "10:30 AM"],
  ["Observation wheel", "The Strip", "Activity", "7:30 PM"],
  ["Drive to Anaheim", "Anaheim", "Travel", "10:00 AM"],
  ["Downtown Disney evening", "Disneyland Resort", "Activity", "5:00 PM"],
  ["Disneyland rope drop", "Disneyland Park", "Activity", "8:00 AM"],
  ["Character breakfast", "Disneyland Resort", "Food", "9:30 AM"],
  ["California Adventure day", "Disney California Adventure", "Activity", "8:00 AM"],
  ["World of Color", "Paradise Gardens Park", "Activity", "9:00 PM"],
  ["Slow resort morning", "Anaheim", "Activity", "10:00 AM"],
  ["Beach afternoon", "Orange County", "Activity", "1:00 PM"],
  ["Favorite rides encore", "Disneyland Park", "Activity", "9:00 AM"],
  ["Souvenir shopping", "Downtown Disney", "Activity", "4:00 PM"],
  ["Celebration dinner", "Anaheim", "Food", "7:00 PM"],
  ["Free day", "Southern California", "Activity", "11:00 AM"],
  ["Pack and check out", "Hotel", "Travel", "9:00 AM"],
  ["Flight home", "Airport", "Travel", "2:00 PM"],
];
function zonedDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((x) => x.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function makeTestPlans(timezone: string) {
  const anchor = new Date(`${zonedDateKey(new Date(), timezone)}T12:00:00Z`);
  const plans = testIdeas.map(([title, place, type, time], index) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() + index - 3);
    return {
      id: 1000 + index,
      date: date.toISOString().slice(0, 10),
      title,
      place,
      type,
      time,
    };
  });
  const today = zonedDateKey(new Date(), timezone);
  return [
    ...plans,
    { id: 2001, date: today, title: "Morning coffee & trip check-in", place: "Hotel lobby", type: "Food" as const, time: "9:00 AM" },
    { id: 2002, date: today, title: "Explore together", place: "Today’s neighborhood", type: "Activity" as const, time: "1:00 PM" },
    { id: 2003, date: today, title: "Dinner plans", place: "Group pick", type: "Food" as const, time: "7:00 PM" },
  ].sort((a, b) => a.date.localeCompare(b.date) || minutesFromTime(a.time) - minutesFromTime(b.time));
}
function makeReservations(timezone: string) {
  const anchor = new Date(`${zonedDateKey(new Date(), timezone)}T12:00:00Z`);
  const offsets = [0, 0, 6, 8];
  return reservationSeed.map((reservation, index) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() + offsets[index]);
    return { ...reservation, date: date.toISOString().slice(0, 10) };
  });
}
function minutesFromTime(time: string) {
  if (!time) return 24 * 60;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return 24 * 60;
  let hour = Number(match[1]);
  if (match[3]) {
    hour %= 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
  }
  return hour * 60 + Number(match[2]);
}
function chronological<T extends { date: string; time: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.date.localeCompare(b.date) || minutesFromTime(a.time) - minutesFromTime(b.time),
  );
}
function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function friendlyTime(time: string) {
  if (!time) return "Any time";
  if (/\b(?:AM|PM)\b/i.test(time)) return time;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
function flightStatusUrl(flightNumber: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${flightNumber} flight status`)}`;
}
function normalizeTime(time: string) {
  const value = time.trim();
  if (!value) return "";
  const twelveHour = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toUpperCase() === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${twelveHour[2] || "00"}`;
  }
  const twentyFourHour = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return twentyFourHour ? `${twentyFourHour[1].padStart(2, "0")}:${twentyFourHour[2]}` : value;
}
const expenseSeed: Expense[] = [
  {
    id: 1,
    name: "Hotel",
    category: "Stay",
    amount: 720,
    paidBy: 1,
    splitWith: [1, 2, 3],
    date: "2026-09-18",
  },
  {
    id: 2,
    name: "Welcome dinner",
    category: "Food",
    amount: 126,
    paidBy: 2,
    splitWith: [1, 2, 3],
    date: "2026-09-18",
  },
  {
    id: 3,
    name: "Museum tickets",
    category: "Activities",
    amount: 75,
    paidBy: 3,
    splitWith: [1, 2, 3],
    date: "2026-09-19",
  },
];
const packSeed = [
  "ID & travel documents",
  "Phone charger",
  "Comfortable shoes",
  "Medication",
];
const reservationSeed: Reservation[] = [
  { id: 1, kind: "Flight", title: "Arrival flight", date: "", time: "2:30 PM", confirmation: "LV8K2Q", location: "LAS" },
  { id: 2, kind: "Hotel", title: "Las Vegas hotel", date: "", time: "4:00 PM", confirmation: "HOTEL-4821", location: "Las Vegas Strip" },
  { id: 3, kind: "Hotel", title: "Anaheim stay", date: "", time: "3:00 PM", confirmation: "", location: "Anaheim" },
  { id: 4, kind: "Tickets", title: "Theme park tickets", date: "", time: "8:00 AM", confirmation: "TICKETS-24", location: "Disneyland Resort" },
];
const decisionSeed: Decision[] = [
  { id: 1, question: "Pick our celebration dinner", options: [{ label: "Steakhouse", votes: 2 }, { label: "Italian", votes: 1 }, { label: "Buffet", votes: 0 }] },
  { id: 2, question: "Best free afternoon plan", options: [{ label: "Pool", votes: 1 }, { label: "Shopping", votes: 2 }, { label: "Nap & reset", votes: 3 }] },
];
const cash = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
function ledger(people: Person[], expenses: Expense[]) {
  const balances = new Map(people.map((p) => [p.id, 0]));
  expenses.forEach((e) => {
    const ids = e.splitWith.filter((id) => balances.has(id));
    if (!ids.length || !balances.has(e.paidBy)) return;
    balances.set(e.paidBy, (balances.get(e.paidBy) || 0) + e.amount);
    ids.forEach((id) =>
      balances.set(id, (balances.get(id) || 0) - e.amount / ids.length),
    );
  });
  const debtors = people
      .map((person) => ({ person, amount: -(balances.get(person.id) || 0) }))
      .filter((x) => x.amount > 0.005),
    creditors = people
      .map((person) => ({ person, amount: balances.get(person.id) || 0 }))
      .filter((x) => x.amount > 0.005),
    payments: Payment[] = [];
  let d = 0,
    c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);
    payments.push({ from: debtors[d].person, to: creditors[c].person, amount });
    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (debtors[d].amount < 0.005) d++;
    if (creditors[c].amount < 0.005) c++;
  }
  return { balances, payments };
}

export default function Home() {
  const [tab, setTab] = useState("Overview"),
    [tripName, setTripName] = useState("Our next adventure"),
    [plans, setPlans] = useState<Plan[]>([]),
    [people, setPeople] = useState<Person[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]),
    [reservations, setReservations] = useState<Reservation[]>([]),
    [decisions, setDecisions] = useState<Decision[]>([]),
    [tripLinks, setTripLinks] = useState<TripLink[]>([]),
    [tripNotes, setTripNotes] = useState(""),
    [packing, setPacking] = useState<PackingItem[]>([]),
    [packed, setPacked] = useState<string[]>([]),
    [auditLog, setAuditLog] = useState<AuditEntry[]>([]),
    [budget, setBudget] = useState<BudgetData>(emptyBudget),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState<"plan" | "expense" | "person" | "reservation" | "assistant" | "link" | "packing" | "trip" | null>(null),
    [toast, setToast] = useState(""),
    [aiQuestion, setAiQuestion] = useState(""),
    [aiAnswer, setAiAnswer] = useState(""),
    [aiBusy, setAiBusy] = useState(false),
    [timezone, setTimezone] = useState("Pacific/Honolulu"),
    [now, setNow] = useState<Date | null>(null),
    [ready, setReady] = useState(false),
    [syncStatus, setSyncStatus] = useState("Connecting…"),
    [calendarView, setCalendarView] = useState<CalendarView>("month"),
    [calendarDate, setCalendarDate] = useState(() => zonedDateKey(new Date(), "Pacific/Honolulu")),
    [planDefaultDate, setPlanDefaultDate] = useState(""),
    [entryKind, setEntryKind] = useState<Plan["type"] | Reservation["kind"]>("Activity"),
    [trips, setTrips] = useState<TripRecord[]>([]),
    [activeTripId, setActiveTripId] = useState(""),
    [historyStatus, setHistoryStatus] = useState({ undo: false, redo: false }),
    [editing, setEditing] = useState<EditTarget | null>(null),
    [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const remoteUpdatedAt = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const lastSavedJson = useRef("");
  const currentJson = useRef("");
  const historyPast = useRef<string[]>([]);
  const historyFuture = useRef<string[]>([]);
  const historyCurrent = useRef("");
  const historyPending = useRef("");
  const historyTimer = useRef<number | null>(null);
  const historyApplying = useRef(false);

  useEffect(() => {
    if (!modal) setEditing(null);
  }, [modal]);

  useEffect(() => {
    if (!activeTripId) return;
    const savedDate = window.localStorage.getItem(`miaki-agenda-date:${activeTripId}`);
    if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) {
      setCalendarDate(savedDate);
      setPlanDefaultDate(savedDate);
    }
  }, [activeTripId]);

  function applySharedState(state: SharedPlannerState) {
    setTripName(state.tripName || "Our next adventure");
    setPlans(Array.isArray(state.plans) ? state.plans : []);
    setPeople(Array.isArray(state.people) ? state.people : []);
    setExpenses(Array.isArray(state.expenses) ? state.expenses : []);
    setReservations(Array.isArray(state.reservations) ? state.reservations : []);
    setDecisions(Array.isArray(state.decisions) ? state.decisions : []);
    setTripLinks(Array.isArray(state.tripLinks) ? state.tripLinks : []);
    setTripNotes(state.tripNotes || "");
    const rawPacking = Array.isArray(state.packing) ? state.packing : [];
    const legacyPacked = Array.isArray(state.packed) ? state.packed : [];
    const normalizedPacking: PackingItem[] = rawPacking.map((item, index) =>
      typeof item === "string"
        ? { id: `legacy-${index}-${item}`, text: item, ownerId: state.people?.[0]?.id || 0 }
        : item,
    );
    setPacking(normalizedPacking);
    setPacked(normalizedPacking.filter((item, index) =>
      legacyPacked.includes(item.id) || (typeof rawPacking[index] === "string" && legacyPacked.includes(String(rawPacking[index]))),
    ).map((item) => item.id));
    setAuditLog(Array.isArray(state.auditLog) ? state.auditLog : []);
    setTimezone(timezones.some(([value]) => value === state.timezone) ? state.timezone : "Pacific/Honolulu");
  }

  function currentTripRecord(id = activeTripId): TripRecord {
    return {
      id: id || `trip-${Date.now()}`,
      createdAt: trips.find((trip) => trip.id === id)?.createdAt || Date.now(),
      tripName, plans, people, expenses, reservations, decisions, tripLinks,
      tripNotes, packing, packed, timezone, auditLog,
    };
  }

  function normalizePlannerState(state: SharedPlannerState | PlannerState): PlannerState {
    if ("trips" in state && Array.isArray(state.trips) && state.trips.length) {
      const activeTripId = state.trips.some((trip) => trip.id === state.activeTripId)
        ? state.activeTripId
        : state.trips[0].id;
      return { version: 2, activeTripId, trips: state.trips, budget: state.budget || emptyBudget() };
    }
    const legacy = state as SharedPlannerState;
    const firstTrip: TripRecord = { ...legacy, id: "trip-original", createdAt: Date.now() };
    return { version: 2, activeTripId: firstTrip.id, trips: [firstTrip], budget: emptyBudget() };
  }

  function applyPlannerState(state: SharedPlannerState | PlannerState) {
    const planner = normalizePlannerState(state);
    setTrips(planner.trips);
    setBudget(planner.budget || emptyBudget());
    setActiveTripId(planner.activeTripId);
    applySharedState(planner.trips.find((trip) => trip.id === planner.activeTripId) || planner.trips[0]);
  }

  function currentPlannerState(): PlannerState {
    const activeTrip = currentTripRecord(activeTripId);
    return {
      version: 2,
      activeTripId,
      budget,
      trips: trips.some((trip) => trip.id === activeTripId)
        ? trips.map((trip) => trip.id === activeTripId ? activeTrip : trip)
        : [...trips, activeTrip],
    };
  }

  function clearPendingHistory() {
    if (historyTimer.current !== null) window.clearTimeout(historyTimer.current);
    historyTimer.current = null;
    historyPending.current = "";
  }

  function commitPendingHistory() {
    if (!historyPending.current) return;
    historyPast.current = [...historyPast.current.slice(-49), historyPending.current];
    historyFuture.current = [];
    clearPendingHistory();
    setHistoryStatus({ undo: true, redo: false });
  }

  function undoChange() {
    commitPendingHistory();
    const target = historyPast.current.pop();
    if (!target) return;
    historyFuture.current.push(historyCurrent.current);
    historyApplying.current = true;
    applyPlannerState(JSON.parse(target));
    setModal(null);
    setHistoryStatus({ undo: historyPast.current.length > 0, redo: true });
    setToast("Last change undone");
  }

  function redoChange() {
    commitPendingHistory();
    const target = historyFuture.current.pop();
    if (!target) return;
    historyPast.current.push(historyCurrent.current);
    historyApplying.current = true;
    applyPlannerState(JSON.parse(target));
    setModal(null);
    setHistoryStatus({ undo: true, redo: historyFuture.current.length > 0 });
    setToast("Change restored");
  }

  useEffect(() => {
    setNow(new Date());
    fetch("/api/state", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load shared planner");
        return response.json();
      })
      .then(({ state, updatedAt }) => {
        const planner = normalizePlannerState(state);
        applyPlannerState(planner);
        lastSavedJson.current = JSON.stringify(state);
        currentJson.current = JSON.stringify(planner);
        historyCurrent.current = JSON.stringify(planner);
        historyPast.current = [];
        historyFuture.current = [];
        setHistoryStatus({ undo: false, redo: false });
        remoteUpdatedAt.current = updatedAt;
        setSyncStatus("Saved to shared database");
        setReady(true);
      })
      .catch(() => setSyncStatus("Database unavailable — changes are not saved"));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready || !activeTripId) return;
    const json = JSON.stringify(currentPlannerState());
    if (!historyCurrent.current) {
      historyCurrent.current = json;
      return;
    }
    if (json === historyCurrent.current) return;
    if (historyApplying.current) {
      historyApplying.current = false;
      historyCurrent.current = json;
      return;
    }
    if (!historyPending.current) historyPending.current = historyCurrent.current;
    historyCurrent.current = json;
    if (historyTimer.current !== null) window.clearTimeout(historyTimer.current);
    historyTimer.current = window.setTimeout(commitPendingHistory, 450);
    return () => {
      if (historyTimer.current !== null) window.clearTimeout(historyTimer.current);
    };
  }, [tripName, plans, people, expenses, reservations, decisions, tripLinks, tripNotes, packing, packed, timezone, auditLog, budget, ready, trips, activeTripId]);
  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select") || target?.isContentEditable) return;
      const redo = (event.key.toLowerCase() === "z" && event.shiftKey) || event.key.toLowerCase() === "y";
      const undo = event.key.toLowerCase() === "z" && !event.shiftKey;
      if (redo && historyFuture.current.length) {
        event.preventDefault();
        redoChange();
      } else if (undo && (historyPast.current.length || historyPending.current)) {
        event.preventDefault();
        undoChange();
      }
    }
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  });
  useEffect(() => {
    if (!activeTripId) return;
    const state = currentPlannerState();
    const json = JSON.stringify(state);
    currentJson.current = json;
    if (!ready || json === lastSavedJson.current) return;
    setSyncStatus("Saving…");
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        try {
          const response = await fetch("/api/state", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ state }),
          });
          if (!response.ok) throw new Error("save failed");
          const result = await response.json();
          lastSavedJson.current = json;
          remoteUpdatedAt.current = result.updatedAt;
          setSyncStatus(currentJson.current === json ? "Saved to shared database" : "Saving…");
        } catch {
          setSyncStatus("Save failed — check connection");
        }
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [tripName, plans, people, expenses, reservations, decisions, tripLinks, tripNotes, packing, packed, timezone, auditLog, budget, ready, trips, activeTripId]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        const incoming = JSON.stringify(result.state);
        if (result.updatedAt > remoteUpdatedAt.current && currentJson.current === lastSavedJson.current) {
          clearPendingHistory();
          historyPast.current = [];
          historyFuture.current = [];
          historyApplying.current = true;
          setHistoryStatus({ undo: false, redo: false });
          lastSavedJson.current = incoming;
          currentJson.current = incoming;
          remoteUpdatedAt.current = result.updatedAt;
          applyPlannerState(result.state);
          setSyncStatus("Updated from shared database");
        }
      } catch {
        setSyncStatus("Offline — reconnecting…");
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [ready]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2200);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const spent = expenses.reduce((s, e) => s + e.amount, 0),
    accounts = useMemo(() => ledger(people, expenses), [people, expenses]),
    filtered = plans.filter((p) =>
      (p.title + p.place + p.type).toLowerCase().includes(query.toLowerCase()),
    ),
    grouped = Object.entries(
      filtered.reduce<Record<string, Plan[]>>(
        (a, p) => ((a[p.date] ||= []).push(p), a),
        {},
      ),
    ),
    nav = ["Overview", "Itinerary", "Expenses", "Packing", "Notes", "Audit Log", "Mia Budget"];
  const todayKey = now ? zonedDateKey(now, timezone) : "";
  const searchText = query.trim().toLowerCase();
  const visiblePlans = searchText ? plans.filter((item) => `${item.title} ${item.place} ${item.type} ${item.date} ${item.time}`.toLowerCase().includes(searchText)) : plans;
  const visibleReservations = searchText ? reservations.filter((item) => `${item.title} ${item.location} ${item.kind} ${item.flightNumber || ""} ${item.confirmation} ${item.date} ${item.time}`.toLowerCase().includes(searchText)) : reservations;
  const allAgendaEntries = chronological([
    ...plans.map((item) => ({ source: "plan" as const, item, date: item.date, time: item.time, kind: item.type, title: item.title, location: item.place })),
    ...reservations.map((item) => ({ source: "reservation" as const, item, date: item.date, time: item.time, kind: item.kind, title: item.title, location: item.location })),
  ]);
  const upcomingAgendaEntries = allAgendaEntries.filter((entry) => entry.date >= todayKey);
  const overviewTimeline = (upcomingAgendaEntries.length ? upcomingAgendaEntries : allAgendaEntries.slice(-6)).slice(0, 6);
  const overviewShowsHistory = !upcomingAgendaEntries.length && allAgendaEntries.length > 0;
  const flightBookings = chronological(reservations.filter((item) => item.kind === "Flight"));
  const hotelBookings = chronological(reservations.filter((item) => item.kind === "Hotel"));
  const otherBookings = chronological(reservations.filter((item) => item.kind !== "Flight" && item.kind !== "Hotel"));
  const agendaDates = Array.from(new Set([...visiblePlans.map((item) => item.date), ...visibleReservations.map((item) => item.date)]))
    .filter(Boolean)
    .sort();
  const todayPlans = plans
    .filter((plan) => plan.date === todayKey)
    .sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));
  const zonedTimeParts = now
    ? Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        })
          .formatToParts(now)
          .map((part) => [part.type, part.value]),
      )
    : null;
  const currentMinutes = zonedTimeParts
    ? (Number(zonedTimeParts.hour) % 24) * 60 + Number(zonedTimeParts.minute)
    : -1;
  const calendarAnchor = new Date(`${calendarDate || todayKey || "2026-01-01"}T12:00:00`);
  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const moveDate = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };
  const weekStart = moveDate(calendarAnchor, -((calendarAnchor.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, index) => moveDate(weekStart, index));
  const monthGridStart = moveDate(
    new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1, 12),
    -new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1, 12).getDay(),
  );
  const monthDates = Array.from({ length: 42 }, (_, index) => moveDate(monthGridStart, index));
  const calendarTitle = calendarView === "month"
    ? calendarAnchor.toLocaleString("en", { month: "long", year: "numeric" })
    : calendarView === "week"
      ? `${weekDates[0].toLocaleString("en", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleString("en", { month: "short", day: "numeric", year: "numeric" })}`
      : calendarAnchor.toLocaleString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  function moveCalendar(direction: number) {
    const next = new Date(calendarAnchor);
    if (calendarView === "month") next.setMonth(next.getMonth() + direction);
    else if (calendarView === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setCalendarDate(toDateKey(next));
  }
  const todayAgendaEntries = allAgendaEntries.filter((entry) => entry.date === todayKey);
  const nextTodayEntry = todayAgendaEntries.find((entry) => minutesFromTime(entry.time) > currentMinutes);
  const nextTripEntry = allAgendaEntries.find((entry) => entry.date > todayKey || (entry.date === todayKey && minutesFromTime(entry.time) > currentMinutes));
  const featuredEntry = nextTodayEntry || nextTripEntry;
  const timezoneLabel = timezones.find(([value]) => value === timezone)?.[1] || timezone;
  const liveDate = now
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now)
    : "Loading today…";
  const liveTime = now
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
      }).format(now)
    : "--:--";
  const modalCopy = modal
    ? {
        plan: editing ? ["UPDATE THE AGENDA", "Edit itinerary item", "Change the details without starting over."] : ["A NEW MEMORY", "Add to the itinerary", "Anything the group wants to remember."],
        person: ["", "Travelers", ""],
        expense: editing?.type === "expense" ? ["UPDATE THE PURCHASE", "Edit expense", "Adjust the amount, payer, or split."] : ["SPLIT IT FAIRLY", "Add an expense", "Choose who paid and who shared it."],
        reservation: ["KEEP IT TOGETHER", "Add a reservation", "Save the details the group will need later."],
        assistant: ["SMART TRIP CHECK", "Ask Miaki", "Get a trip-aware review of plans, bookings, and loose ends."],
        link: editing?.type === "link" ? ["KEEP IT CURRENT", "Edit useful link", "Update its label or destination."] : ["SAVE FOR LATER", "Add a useful link", "Keep tickets, maps, menus, and documents easy to find."],
        packing: editing?.type === "packing" ? ["UPDATE THE LIST", "Edit packing item", "Change the item or who is bringing it."] : ["PACK WITH PURPOSE", "Add a packing item", "One less thing to forget before you leave."],
        trip: ["YOUR TRIP COLLECTION", "Create a new trip", "Every trip gets its own plans, people, expenses, and details."],
      }[modal]
    : null;
  const pname = (id: number) =>
    id === 0 ? "Unassigned" : people.find((p) => p.id === id)?.name || "Unknown";
  function rememberAgendaDate(date: string) {
    setCalendarDate(date);
    setPlanDefaultDate(date);
    if (activeTripId) window.localStorage.setItem(`miaki-agenda-date:${activeTripId}`, date);
  }
  function logActivity(category: AuditEntry["category"], action: string, detail: string) {
    const entry: AuditEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now(), category, action, detail, actor: "Shared user" };
    setAuditLog((items) => [entry, ...items].slice(0, 250));
  }
  function openPlanModal(date?: string) {
    const rememberedDate = date || calendarDate || todayKey;
    setEditing(null);
    rememberAgendaDate(rememberedDate);
    setEntryKind("Activity");
    setModal("plan");
  }
  function editItinerary(item: Plan | Reservation, type: "plan" | "reservation") {
    setEditing(type === "plan" ? { type, item: item as Plan } : { type, item: item as Reservation });
    rememberAgendaDate(item.date);
    setEntryKind(type === "plan" ? (item as Plan).type : (item as Reservation).kind);
    setModal("plan");
  }
  function deleteEditingItinerary() {
    if (editing?.type === "plan") {
      logActivity("Itinerary", "Deleted", editing.item.title);
      setPlans((items) => items.filter((item) => item.id !== editing.item.id));
    } else if (editing?.type === "reservation") {
      logActivity("Itinerary", "Deleted", editing.item.title);
      setReservations((items) => items.filter((item) => item.id !== editing.item.id));
    }
    setEditing(null);
    setModal(null);
  }
  function addPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const kind = String(f.get("kind") || "Activity") as Plan["type"] | Reservation["kind"];
    const isPlanKind = kind === "Activity" || kind === "Travel" || kind === "Food";
    const chosenDate = String(f.get("date")) || calendarDate || todayKey;
    rememberAgendaDate(chosenDate);
    const editedId = editing?.type === "plan" || editing?.type === "reservation" ? editing.item.id : Date.now();
    if (!isPlanKind) {
      const next: Reservation = {
        id: editedId, kind, title: String(f.get("title")), date: chosenDate,
        time: normalizeTime(String(f.get("time") || "")), arrivalTime: normalizeTime(String(f.get("arrivalTime") || "")),
        location: String(f.get("location") || "").trim(), confirmation: String(f.get("confirmation") || "").trim(),
        flightNumber: String(f.get("flightNumber") || "").trim(),
      };
      setPlans((items) => editing?.type === "plan" ? items.filter((item) => item.id !== editedId) : items);
      setReservations((items) => editing?.type === "reservation" ? items.map((item) => item.id === editedId ? next : item) : [...items, next]);
      logActivity("Itinerary", editing ? "Updated" : "Added", `${next.title} · ${kind}`);
      setModal(null);
      setToast(editing ? `${kind} updated` : `${kind} added to the itinerary`);
      return;
    }
    const next: Plan = {
          id: editedId,
          date: chosenDate,
          title: String(f.get("title")),
          place: String(f.get("place") || "").trim(),
      time: normalizeTime(String(f.get("time") || "")),
          type: kind as Plan["type"],
          done: editing?.type === "plan" ? editing.item.done : false,
        };
    setReservations((items) => editing?.type === "reservation" ? items.filter((item) => item.id !== editedId) : items);
    setPlans((items) => chronological(editing?.type === "plan" ? items.map((item) => item.id === editedId ? next : item) : [...items, next]));
    logActivity("Itinerary", editing ? "Updated" : "Added", `${next.title} · ${next.type}`);
    setModal(null);
    setToast(editing ? "Itinerary item updated" : "Plan added");
  }
  function addPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      name = String(f.get("name")).trim();
    if (!name) return;
    setPeople((v) => editing?.type === "person"
      ? v.map((person) => person.id === editing.item.id ? { ...person, name } : person)
      : [...v, { id: Date.now(), name, color: palette[v.length % palette.length] }]);
    logActivity("Traveler", editing?.type === "person" ? "Updated" : "Added", name);
    setModal(null);
    setToast(editing?.type === "person" ? `${name} updated` : `${name} joined the trip`);
  }
  function removePerson(person: Person) {
    if (people.length <= 1) {
      setToast("Keep at least one traveler on the trip");
      return;
    }
    setPeople((v) => v.filter((x) => x.id !== person.id));
    setExpenses((v) =>
      v
        .map((x) => ({
          ...x,
          splitWith: x.splitWith.filter((id) => id !== person.id).length
            ? x.splitWith.filter((id) => id !== person.id)
            : [x.paidBy],
        }))
        .filter((x) => x.paidBy !== person.id),
    );
    setPacking((items) => items.map((item) => item.ownerId === person.id ? { ...item, ownerId: 0 } : item));
    logActivity("Traveler", "Removed", person.name);
    setToast(`${person.name} was removed`);
  }
  function requestRemovePerson(person: Person) {
    if (people.length <= 1) {
      setToast("Keep at least one traveler on the trip");
      return;
    }
    setConfirming({ type: "person", item: person });
  }
  function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      splitWith = f.getAll("splitWith").map(Number);
    if (!splitWith.length) {
      setToast("Choose at least one person");
      return;
    }
    const next: Expense = {
        id: editing?.type === "expense" ? editing.item.id : Date.now(),
        name: String(f.get("name")),
        category: String(f.get("category")),
        amount: Number(f.get("amount")),
        paidBy: Number(f.get("paidBy")),
        splitWith,
        date: String(f.get("date")),
        notes: String(f.get("notes") || "").trim(),
      };
    setExpenses((v) => editing?.type === "expense" ? v.map((item) => item.id === next.id ? next : item) : [next, ...v]);
    logActivity("Expense", editing?.type === "expense" ? "Updated" : "Added", `${next.name} · ${cash(next.amount)}`);
    setModal(null);
    setToast(editing?.type === "expense" ? "Expense updated" : "Expense added and split");
  }
  function addReservation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setReservations((items) => [
      ...items,
      {
        id: Date.now(),
        kind: String(f.get("kind")) as Reservation["kind"],
        title: String(f.get("title")),
        date: String(f.get("date")),
        time: normalizeTime(String(f.get("time"))),
        confirmation: String(f.get("confirmation")),
        location: String(f.get("location")),
        flightNumber: String(f.get("flightNumber") || "").trim(),
        arrivalTime: normalizeTime(String(f.get("arrivalTime") || "")),
      },
    ]);
    logActivity("Itinerary", "Added", String(f.get("title")));
    setModal(null);
    setToast("Reservation saved");
  }
  function addLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const label = String(f.get("label")).trim();
    const url = String(f.get("url")).trim();
    if (!label || !url) return;
    setTripLinks((items) => editing?.type === "link" ? items.map((item) => item.id === editing.item.id ? { ...item, label, url } : item) : [...items, { id: Date.now(), label, url }]);
    setModal(null);
    setToast("Link saved to Quick access");
  }
  function addPackingItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const item = String(f.get("item")).trim();
    if (!item) return;
    setPacking((items) => editing?.type === "packing" ? items.map((entry) => entry.id === editing.item.id ? { ...entry, text: item, ownerId: Number(f.get("ownerId")) } : entry) : [...items, { id: `pack-${Date.now()}`, text: item, ownerId: Number(f.get("ownerId")) }]);
    logActivity("Packing", editing?.type === "packing" ? "Updated" : "Added", item);
    setModal(null);
    setToast("Packing item added");
  }
  function switchTrip(id: string) {
    if (id === activeTripId) return;
    const nextTrip = trips.find((trip) => trip.id === id);
    if (!nextTrip) return;
    setTrips((items) => items.map((trip) => trip.id === activeTripId ? currentTripRecord(activeTripId) : trip));
    setActiveTripId(id);
    applySharedState(nextTrip);
    setTab("Overview");
    setCalendarDate(zonedDateKey(new Date(), nextTrip.timezone));
    setToast(`Switched to ${nextTrip.tripName}`);
  }
  function addTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    if (!name) return;
    const id = `trip-${Date.now()}`;
    const newTrip: TripRecord = {
      id, createdAt: Date.now(), tripName: name, plans: [], people: [], expenses: [],
      reservations: [], decisions: [], tripLinks: [], tripNotes: "", packing: [], packed: [], timezone, auditLog: [],
    };
    setTrips((items) => [...items.map((trip) => trip.id === activeTripId ? currentTripRecord(activeTripId) : trip), newTrip]);
    setActiveTripId(id);
    applySharedState(newTrip);
    setModal(null);
    setTab("Overview");
    setToast(`${name} is ready to plan`);
  }
  function removeCurrentTrip() {
    if (trips.length <= 1) {
      setToast("Keep at least one trip in your planner");
      return;
    }
    const remaining = trips.filter((trip) => trip.id !== activeTripId);
    setTrips(remaining);
    setActiveTripId(remaining[0].id);
    applySharedState(remaining[0]);
    setTab("Overview");
    setToast("Trip deleted");
  }
  function requestRemoveCurrentTrip() {
    if (trips.length <= 1) {
      setToast("Keep at least one trip in your planner");
      return;
    }
    setConfirming({ type: "trip" });
  }
  function localTripAdvice(question: string) {
    const missing = reservations.filter((item) => !item.confirmation);
    const crowdedDays = Object.entries(
      plans.reduce<Record<string, number>>((days, plan) => {
        days[plan.date] = (days[plan.date] || 0) + 1;
        return days;
      }, {}),
    ).filter(([, count]) => count > 3);
    const advice = [
      `Next: ${nextTripEntry ? `${nextTripEntry.title} on ${nextTripEntry.date} at ${friendlyTime(nextTripEntry.time)}` : "No upcoming plan is scheduled."}`,
      missing.length
        ? `Confirm ${missing.map((item) => item.title).join(", ")} before departure.`
        : "All saved bookings have confirmation numbers.",
      crowdedDays.length
        ? `${crowdedDays.length} day${crowdedDays.length > 1 ? "s have" : " has"} more than three activities—leave room for transit and rest.`
        : "The itinerary has comfortable spacing.",
      `${packing.length - packed.length} packing item${packing.length - packed.length === 1 ? "" : "s"} remain.`,
      "Recheck live hours, weather, traffic, ticket rules, and accessibility needs with the official provider before leaving.",
    ];
    return `Smart trip check for “${question}”\n\n• ${advice.join("\n• ")}`;
  }
  async function askAssistant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = aiQuestion.trim();
    if (!question) return;
    setAiBusy(true);
    setAiAnswer("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: { tripName, timezone, today: todayKey, people: people.map((p) => p.name), plans, reservations, expenses, packing: { total: packing.length, packed: packed.length } },
        }),
      });
      const data = await response.json();
      setAiAnswer(data.text || localTripAdvice(question));
    } catch {
      setAiAnswer(localTripAdvice(question));
    } finally {
      setAiBusy(false);
    }
  }
  function downloadTripBackup() {
    const backup = { version: 1, exportedAt: new Date().toISOString(), tripName, timezone, people, plans, reservations, expenses, packing, packed, decisions, tripLinks, tripNotes };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tripName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "miaki-trip"}-backup.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Trip backup downloaded");
  }
  return (
    <main className={`shell${tab === "Mia Budget" ? " budget-workspace" : ""}`}>
      <aside>
        <div className="brand">
          <i aria-label="Airplane"><Plane size={21} strokeWidth={2.2} /></i>
          <div>
              <b>Miaki<br />Planner</b>
            <small>group trip planner</small>
          </div>
        </div>
        <nav>
          {nav.map((n, i) => (
            <button
              className={tab === n ? "active" : ""}
              key={n}
              aria-label={n}
              aria-current={tab === n ? "page" : undefined}
              onClick={() => setTab(n)}
            >
              <span>{[<Compass key="o" />, <CalendarDays key="i" />, <BadgeDollarSign key="e" />, <Luggage key="p" />, <NotebookPen key="n" />, <ClipboardList key="a" />, <WalletCards key="b" />][i]}</span>
              <span className="sidebar-label">{n}</span>
            </button>
          ))}
        </nav>
        <section className="trip-switcher" hidden>
          <div className="trip-switcher-head">
            <small>MY TRIPS</small>
            <button aria-label="Create a new trip" onClick={() => setModal("trip")}><CirclePlus size={17} /></button>
          </div>
          <div className="trip-tabs">
            {trips.map((trip) => (
              <button className={trip.id === activeTripId ? "active" : ""} key={trip.id} onClick={() => switchTrip(trip.id)}>
                <span>{trip.tripName.slice(0, 1).toUpperCase()}</span>
                <div><b>{trip.id === activeTripId ? tripName : trip.tripName}</b><small>{trip.id === activeTripId ? people.length : trip.people.length} travelers · {trip.id === activeTripId ? plans.length + reservations.length : trip.plans.length + trip.reservations.length} itinerary items</small></div>
              </button>
            ))}
          </div>
          <div className="trip-switcher-actions">
            <div className="avatar-row">{people.slice(0, 5).map((p) => <Avatar key={p.id} p={p} />)}</div>
            {trips.length > 1 && <button className="delete-trip" onClick={requestRemoveCurrentTrip}>Delete trip</button>}
          </div>
        </section>
      </aside>
      <section className="workspace">
        <header>
          <b className="mobile-logo"><Plane size={19} /> Miaki Planner</b>
          <label className="mobile-trip-picker">
            <span>Trip</span>
            <select aria-label="Current trip" value={activeTripId} onChange={(event) => switchTrip(event.target.value)}>
              {trips.map((trip) => <option value={trip.id} key={trip.id}>{trip.id === activeTripId ? tripName : trip.tripName}</option>)}
            </select>
          </label>
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Search itinerary and bookings"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim()) setTab("Itinerary"); }}
              placeholder="Search plans and places..."
            />
          </label>
          <label className="timezone-picker">
            <span>{liveTime}</span>
            <select
              aria-label="Trip timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {timezones.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {(/unavailable|failed|error|not saved|offline/i.test(syncStatus)) && <span className="sync-state" role="status">{syncStatus}</span>}
          <div className="history-controls" role="group" aria-label="Change history">
            <button type="button" onClick={undoChange} disabled={!historyStatus.undo} aria-label="Undo last change" title="Undo (Ctrl/Cmd+Z)">
              <Undo2 size={17} />
            </button>
            <button type="button" onClick={redoChange} disabled={!historyStatus.redo} aria-label="Redo last change" title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)">
              <Redo2 size={17} />
            </button>
          </div>
          <button className="soft" aria-label="Add traveler" title="Add traveler" onClick={() => setModal("person")}>
            <Users size={17} />
          </button>
          <button className="primary" aria-label={tab === "Expenses" ? "Add expense" : "Add itinerary item"} title={tab === "Expenses" ? "Add expense" : "Add itinerary item"} onClick={() => { if (tab === "Expenses") setModal("expense"); else openPlanModal(); }}>
            <CirclePlus size={17} />
          </button>
        </header>
        {tab !== "Mia Budget" && <div className="trip-context">
          <span className="trip-context-title">{tab}</span>
          <details className="trip-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
            <summary aria-label="Select trip">{tripName}</summary>
            <div className="trip-menu-panel" onClick={(event) => { if ((event.target as HTMLElement).closest("button")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
              {trips.map((trip) => <button key={trip.id} className={trip.id === activeTripId ? "selected" : ""} aria-current={trip.id === activeTripId ? "true" : undefined} onClick={() => switchTrip(trip.id)}><span>{trip.id === activeTripId ? tripName : trip.tripName}</span>{trip.id === activeTripId && <Check size={16}/>}</button>)}
              <div className="trip-menu-actions"><button onClick={() => setModal("trip")}><CirclePlus size={17}/> Create trip</button>{trips.length > 1 && <button onClick={requestRemoveCurrentTrip}><Trash2 size={17}/> Delete current trip</button>}</div>
            </div>
          </details>
        </div>}
        {tab === "Overview" && (
          <div className="page">
            <section className="hero">
              <div className="hero-copy">
                <textarea
                  className="trip-name"
                  aria-label="Trip name"
                  rows={1}
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                />
                <div>
                  <button
                    className="primary"
                    onClick={() => setTab("Itinerary")}
                  >
                    Open itinerary →
                  </button>
                  <span>{people.length} people</span>
                  <span>{plans.length + reservations.length} itinerary items</span>
                  <span>{expenses.length} expenses</span>
                </div>
              </div>
            </section>
            <section className="stats">
              <Stat
                icon={<Sparkles size={18} />}
                label="ITINERARY"
                value={`${plans.length + reservations.length}`}
                sub="scheduled trip items"
              />
              <Stat
                icon={<UserRound size={18} />}
                label="TRAVELERS"
                value={`${people.length}`}
                sub="sharing this adventure"
              />
              <Stat
                icon={<DollarSign size={18} />}
                label="TOTAL SPENT"
                value={cash(spent)}
                sub={`${expenses.length} shared purchases`}
              />
              <Stat
                icon={<Check size={18} />}
                label="PACKING"
                value={`${packed.length} / ${packing.length}`}
                sub={`${Math.round((packed.length / packing.length) * 100) || 0}% ready to go`}
              />
            </section>
            <section className="overview-center card">
              <div className="overview-center-head">
                <div><h2>Your trip at a glance</h2></div>
                <div className="overview-jumps">
                  <button onClick={() => setTab("Itinerary")}><CalendarDays size={17} /> Itinerary <b>{plans.length + reservations.length}</b></button>
                  <button onClick={() => setTab("Expenses")}><BadgeDollarSign size={17} /> Expenses <b>{expenses.length}</b></button>
                  <button onClick={() => setTab("Packing")}><Luggage size={17} /> Packing <b>{packing.length}</b></button>
                </div>
              </div>
              <div className="overview-timeline">
                <div className="preview-title"><div><small>{overviewShowsHistory ? "TRIP HISTORY" : "NEXT UP"}</small><b>{overviewShowsHistory ? "Your latest trip moments" : "Your trip in order"}</b></div><button onClick={() => setTab("Itinerary")}>Open full itinerary →</button></div>
                {overviewTimeline.length ? overviewTimeline.map((entry) => <button className="overview-preview-row" key={`${entry.source}-${entry.item.id}`} onClick={() => { if (entry.source === "reservation" && entry.item.flightNumber) window.open(flightStatusUrl(entry.item.flightNumber), "_blank", "noopener,noreferrer"); else { rememberAgendaDate(entry.date); setCalendarView("agenda"); setTab("Itinerary"); } }}><span>{shortDate(entry.date)}</span><div><b><em className={`event-tag ${entry.kind.toLowerCase()}`}>{entry.kind}</em>{entry.source === "reservation" && entry.item.flightNumber ? <span className="flight-number">{entry.item.flightNumber} ↗</span> : ""}{entry.source === "reservation" && entry.item.flightNumber ? " · " : ""}{entry.title}</b><small><strong>{friendlyTime(entry.time)}{entry.source === "reservation" && entry.item.arrivalTime ? ` → ${friendlyTime(entry.item.arrivalTime)}` : ""}</strong>{entry.location ? ` · ${entry.location}` : ""}</small></div></button>) : <Empty text="Nothing is scheduled yet. Add the first item to your itinerary." />}
              </div>
              <div className="travel-essentials">
                <div className="essentials-heading"><div><h3>Your bookings</h3></div><button onClick={() => openPlanModal()}><CirclePlus size={15} /> Add booking</button></div>
                <div className="essential-grid">
                  {[
                    { key: "flight", title: "Flights", hint: "Departure and arrival", items: flightBookings },
                    { key: "hotel", title: "Hotels & stays", hint: "Where you’re sleeping", items: hotelBookings },
                    { key: "booking", title: "Tickets & bookings", hint: "Everything else reserved", items: otherBookings },
                  ].map((group) => <section className={`essential-card ${group.key}`} key={group.key}>
                    <header><i>{group.key === "flight" ? <Plane size={18} /> : group.key === "hotel" ? <HotelIcon size={18} /> : <Tickets size={18} />}</i><div><h4>{group.title}</h4><p>{group.hint}</p></div><b>{group.items.length}</b></header>
                    <div>{group.items.length ? <>{group.items.slice(0, 3).map((item) => <button key={item.id} onClick={() => { if (item.flightNumber) window.open(flightStatusUrl(item.flightNumber), "_blank", "noopener,noreferrer"); else { rememberAgendaDate(item.date); setTab("Itinerary"); } }}><span><strong className={item.flightNumber ? "flight-number" : ""}>{item.flightNumber ? `${item.flightNumber} ↗` : item.title}</strong>{item.flightNumber && <small>{item.title}</small>}</span><em>{shortDate(item.date)} · {friendlyTime(item.time)}{item.arrivalTime ? ` → ${friendlyTime(item.arrivalTime)}` : ""}</em>{item.location && <small>{item.location}</small>}</button>)}{group.items.length > 3 && <button className="essential-more" onClick={() => setTab("Itinerary")}>+{group.items.length - 3} more · View all in itinerary</button>}</> : <p className="essential-empty">No {group.title.toLowerCase()} added yet.</p>}</div>
                  </section>)}
                </div>
              </div>
            </section>
            <section className="twocol">
              <div className="card">
                <Title
                  over={todayAgendaEntries.length ? liveDate.toUpperCase() : nextTripEntry ? "NEXT ON YOUR TRIP" : liveDate.toUpperCase()}
                  title={todayAgendaEntries.length ? "Today’s schedule" : nextTripEntry ? new Date(`${nextTripEntry.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Nothing scheduled today"}
                  action={
                    <button onClick={() => setTab("Itinerary")}>
                      Full itinerary →
                    </button>
                  }
                />
                <div className="live-status">
                  <span className="live-dot" />
                  <div>
                    <small>{nextTodayEntry ? "UP NEXT TODAY" : nextTripEntry ? "AFTER TODAY" : "FREE FOR THE REST OF TODAY"}</small>
                    <b>{featuredEntry?.title || "Nothing else planned"}</b>
                    <p>
                      {featuredEntry
                        ? `${featuredEntry.date === todayKey ? "Today" : new Date(`${featuredEntry.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${friendlyTime(featuredEntry.time)}${featuredEntry.location ? ` · ${featuredEntry.location}` : ""}`
                        : "Enjoy the free time"}
                    </p>
                  </div>
                  <strong>{featuredEntry && featuredEntry.date !== todayKey ? shortDate(featuredEntry.date) : liveTime}</strong>
                </div>
                <div className="today-agenda">
                  {todayAgendaEntries.length ? (
                    todayAgendaEntries.map((entry) => <button className="overview-preview-row" key={`today-${entry.source}-${entry.item.id}`} onClick={() => { rememberAgendaDate(entry.date); setTab("Itinerary"); }}><span>{friendlyTime(entry.time)}</span><div><b><em className={`event-tag ${entry.kind.toLowerCase()}`}>{entry.kind}</em>{entry.title}</b><small>{entry.location || "No location added"}</small></div></button>)
                  ) : (
                    <Empty text={nextTripEntry ? `Nothing is scheduled today. Your next event is ${shortDate(nextTripEntry.date)}.` : "Nothing planned today—make it spontaneous!"} />
                  )}
                </div>
              </div>
              <div className="card settlement-mini">
                <Title
                  over="GROUP BALANCE"
                  title="Who owes whom"
                  action={
                    <button onClick={() => setTab("Expenses")}>
                      Settle up →
                    </button>
                  }
                />
                {accounts.payments.length ? (
                  accounts.payments
                    .slice(0, 3)
                    .map((s) => (
                      <SettlementRow key={`${s.from.id}-${s.to.id}`} s={s} />
                    ))
                ) : (
                  <Empty text="Everyone is settled up. Nice!" />
                )}
              </div>
            </section>
          </div>
        )}
        {tab === "Itinerary" && (
          <div className="page unified-itinerary">
            <section className="agenda-summary">
              <div><b>{agendaDates.length}</b><span>days</span></div>
              <div><b>{plans.length}</b><span>plans</span></div>
              <div><b>{reservations.filter((item) => item.kind === "Flight").length}</b><span>flights</span></div>
              <div><b>{reservations.filter((item) => item.kind === "Hotel").length}</b><span>hotels</span></div>
              <button onClick={() => openPlanModal()}><CirclePlus size={16} /> Add itinerary item</button>
            </section>
            <div className="unified-days">
              {agendaDates.length ? agendaDates.map((date) => {
                const items = [
                  ...visiblePlans.filter((item) => item.date === date).map((item) => ({ source: "plan" as const, time: item.time, item })),
                  ...visibleReservations.filter((item) => item.date === date).map((item) => ({ source: "reservation" as const, time: item.time, item })),
                ].sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));
                return <section className={`unified-day ${date === todayKey ? "today" : ""}`} key={date}>
                  <header>
                    <div><b>{new Date(date + "T12:00").getDate()}</b><span>{new Date(date + "T12:00").toLocaleString("en", { month: "short" })}</span></div>
                    <p><strong>{new Date(date + "T12:00").toLocaleString("en", { weekday: "long" })}</strong><small>{new Date(date + "T12:00").toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</small></p>
                    {date === todayKey && <em>TODAY</em>}
                    <button onClick={() => openPlanModal(date)}><CirclePlus size={15} /> Add</button>
                  </header>
                  <div className="unified-day-items">
                    {items.map((entry) => entry.source === "plan" ? (
                      <article className="agenda-item activity" key={`plan-${entry.item.id}`}>
                        <div className="agenda-time"><b>{friendlyTime(entry.item.time)}</b></div>
                        <div className="agenda-copy"><h3>{entry.item.title}</h3>{entry.item.place && <p>{entry.item.place}</p>}</div>
                        <span className="agenda-category">{entry.item.type}</span>
                        <button className="edit" aria-label={`Edit ${entry.item.title}`} onClick={() => editItinerary(entry.item, "plan")}><Pencil size={15} /></button>
                        <button className={`check ${entry.item.done ? "done" : ""}`} aria-label={`Mark ${entry.item.title} complete`} onClick={() => setPlans((value) => value.map((item) => item.id === entry.item.id ? { ...item, done: !item.done } : item))}>{entry.item.done ? "✓" : ""}</button>
                      </article>
                    ) : (
                      <article className={`agenda-item booking ${entry.item.kind.toLowerCase()}`} key={`reservation-${entry.item.id}`}>
                        <div className="agenda-time"><b>{friendlyTime(entry.item.time)}</b>{entry.item.arrivalTime && <small>to {friendlyTime(entry.item.arrivalTime)}</small>}</div>
                        <div className="agenda-copy"><h3>{entry.item.title}</h3>{entry.item.location && <p>{entry.item.location}</p>}{entry.item.flightNumber && <small>Flight <a className="flight-number" href={flightStatusUrl(entry.item.flightNumber)} target="_blank" rel="noreferrer" aria-label={`Open live status for flight ${entry.item.flightNumber}`}>{entry.item.flightNumber} ↗</a></small>}{entry.item.confirmation && <small>Confirmation: {entry.item.confirmation}</small>}</div>
                        <span className="agenda-category">{entry.item.kind}</span>
                        <button className="edit" aria-label={`Edit ${entry.item.title}`} onClick={() => editItinerary(entry.item, "reservation")}><Pencil size={15} /></button>
                      </article>
                    ))}
                  </div>
                </section>;
              }) : <div className="agenda-empty"><Empty text={searchText ? `No itinerary items match “${query.trim()}”.` : "Your itinerary is empty. Add the first activity, flight, hotel, or booking."} />{!searchText && <button className="primary" onClick={() => openPlanModal()}><CirclePlus size={17} /> Add to itinerary</button>}</div>}
            </div>
            <section className="agenda-extras">
              <div className="card notes-card"><Title over="KEEP HANDY" title="Trip notes" /><textarea value={tripNotes} onChange={(event) => setTripNotes(event.target.value)} placeholder="Emergency contacts, meetup details, hotel address, reminders…" /></div>
              <div className="card links-card"><Title over="DOCUMENTS & LINKS" title="Quick links" action={<button onClick={() => setModal("link")}><CirclePlus size={16} /> Link</button>} />{tripLinks.length ? tripLinks.map((link) => <div key={link.id}><a href={link.url} target="_blank" rel="noreferrer"><i><ExternalLink size={14} /></i><span>{link.label}</span></a><button className="edit" aria-label={`Edit ${link.label}`} onClick={() => { setEditing({ type: "link", item: link }); setModal("link"); }}><Pencil size={14} /></button><button aria-label={`Remove ${link.label}`} onClick={() => setTripLinks((items) => items.filter((item) => item.id !== link.id))}>×</button></div>) : <Empty text="Save tickets, maps, menus, or shared documents." />}</div>
            </section>
          </div>
        )}
        {false && tab === "Itinerary" && (
          <div className="page">
            <Title
              big
              over="YOUR DAYS, YOUR WAY"
              title="Trip itinerary"
              sub="Add itinerary item, anywhere—then keep the whole group in sync."
              action={
                <button className="primary" onClick={() => openPlanModal()}>
                  <CirclePlus size={17} /> Add itinerary item
                </button>
              }
            />
            <section className="calendar-toolbar" aria-label="Calendar controls">
              <div className="calendar-nav">
                <button className="soft" onClick={() => moveCalendar(-1)} aria-label="Previous period">‹</button>
                <button className="soft today-button" onClick={() => setCalendarDate(todayKey)}>Today</button>
                <button className="soft" onClick={() => moveCalendar(1)} aria-label="Next period">›</button>
                <h2>{calendarTitle}</h2>
              </div>
              <div className="calendar-live"><span className="live-dot" />{liveTime} · {timezoneLabel}</div>
              <div className="view-switch" role="group" aria-label="Calendar view">
                {(["month", "week", "agenda"] as CalendarView[]).map((view) => (
                  <button key={view} className={calendarView === view ? "active" : ""} onClick={() => setCalendarView(view)}>
                    {view[0].toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            {calendarView === "month" && (
              <section className="month-calendar">
                <div className="month-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <b key={day}>{day}</b>)}</div>
                <div className="month-grid">
                  {monthDates.map((date) => {
                    const key = toDateKey(date);
                    const dayPlans = plans.filter((plan) => plan.date === key).sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));
                    return (
                      <button
                        className={`month-cell ${date.getMonth() !== calendarAnchor.getMonth() ? "outside" : ""} ${key === todayKey ? "today" : ""}`}
                        key={key}
                        onClick={() => { setCalendarDate(key); setCalendarView("agenda"); }}
                      >
                        <span>{date.getDate()}</span>
                        <div>
                          {dayPlans.slice(0, 3).map((plan) => <small className={plan.type} key={plan.id}><i />{plan.time ? `${plan.time} ` : ""}{plan.title}</small>)}
                          {dayPlans.length > 3 && <em>+{dayPlans.length - 3} more</em>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {calendarView === "week" && (
              <section className="week-calendar-wrap">
                <div className="week-calendar">
                  <div className="week-corner" />
                  {weekDates.map((date) => {
                    const key = toDateKey(date);
                    return <button className={`week-heading ${key === todayKey ? "today" : ""} ${key === calendarDate ? "selected" : ""}`} key={key} onClick={() => setCalendarDate(key)}><small>{date.toLocaleString("en", { weekday: "short" })}</small><b>{date.getDate()}</b></button>;
                  })}
                  <div className="time-gutter">{Array.from({ length: 18 }, (_, index) => <span key={index}>{index + 6 <= 12 ? index + 6 : index - 6}:00 {index + 6 < 12 ? "AM" : "PM"}</span>)}</div>
                  {weekDates.map((date) => {
                    const key = toDateKey(date);
                    const dayPlans = plans.filter((plan) => plan.date === key);
                    return (
                      <div className={`week-day-column ${key === todayKey ? "today" : ""}`} key={key}>
                        {Array.from({ length: 18 }, (_, index) => <i className="hour-line" style={{ top: `${(index / 18) * 100}%` }} key={index} />)}
                        {key === todayKey && currentMinutes >= 360 && currentMinutes <= 1440 && <div className="current-time-line" style={{ top: `${((currentMinutes - 360) / 1080) * 100}%` }}><span>{liveTime}</span></div>}
                        {dayPlans.map((plan) => {
                          const start = Math.max(360, minutesFromTime(plan.time));
                          return <button className={`week-event ${plan.type}`} style={{ top: `${((start - 360) / 1080) * 100}%` }} key={plan.id} onClick={() => { setCalendarDate(key); setCalendarView("agenda"); }}><b>{plan.title}</b><small>{plan.time || "Any time"}</small></button>;
                        })}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {calendarView === "agenda" && <div className="days">
              {grouped.some(([date]) => date === (calendarDate || todayKey)) ? (
                grouped.filter(([date]) => date === (calendarDate || todayKey)).map(([date, items]) => (
                  <section
                    className={`day ${date === todayKey ? "today" : ""}`}
                    key={date}
                  >
                    <div className="daydate">
                      {date === todayKey && <em>TODAY</em>}
                      <b>{new Date(date + "T12:00").getDate()}</b>
                      <span>
                        {new Date(date + "T12:00").toLocaleString("en", {
                          month: "short",
                        })}
                      </span>
                      <small>
                        {new Date(date + "T12:00").toLocaleString("en", {
                          weekday: "short",
                        })}
                      </small>
                    </div>
                    <div>
                      {items.map((p) => (
                        <article key={p.id}>
                          <button
                            className={`check ${p.done ? "done" : ""}`}
                            onClick={() =>
                              setPlans((v) =>
                                v.map((x) =>
                                  x.id === p.id ? { ...x, done: !x.done } : x,
                                ),
                              )
                            }
                          >
                            {p.done ? "✓" : ""}
                          </button>
                          <div>
                            <small>{friendlyTime(p.time)}</small>
                            <h3>{p.title}</h3>
                            {p.place && <p>⌖ {p.mapUrl ? <a href={p.mapUrl} target="_blank" rel="noreferrer">{p.place} <ExternalLink size={12} /></a> : p.place}</p>}
                          </div>
                          <span className={`pill ${p.type}`}>{p.type}</span>
                          <button
                            className="del"
                            aria-label={`Delete ${p.title}`}
                            onClick={() =>
                              setPlans((v) => v.filter((x) => x.id !== p.id))
                            }
                          >
                            ×
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="agenda-empty"><Empty text={`Nothing planned for ${new Date((calendarDate || todayKey) + "T12:00").toLocaleDateString("en", { month: "long", day: "numeric" })}.`} /><button className="primary" onClick={() => openPlanModal(calendarDate || todayKey)}><CirclePlus size={17} /> Add itinerary item</button></div>
              )}
            </div>}
          </div>
        )}
        {tab === "Trip Hub" && (
          <div className="page">
            <Title
              big
              over="EVERY DETAIL, ONE PLACE"
              title="Trip hub"
              sub="Bookings, confirmations, links, and important notes."
              action={
                <button className="primary" onClick={() => setModal("reservation")}>
                  <CirclePlus size={17} /> Reservation
                </button>
              }
            />
            <section className="hub-stats">
              <div><small>BOOKINGS</small><b>{reservations.length}</b><span>saved in one place</span></div>
              <div className={reservations.some((item) => !item.confirmation) ? "attention" : ""}><small>NEEDS ATTENTION</small><b>{reservations.filter((item) => !item.confirmation).length}</b><span>missing confirmations</span></div>
              <div><small>USEFUL LINKS</small><b>{tripLinks.length}</b><span>documents and references</span></div>
            </section>
            <section className="hub-layout">
              <div className="hub-main">
                <section className="card reservations-card">
                  <Title over="BOOKED & READY" title="Bookings" action={<button onClick={() => setModal("reservation")}>＋ Add</button>} />
                  {reservations.length ? chronological(reservations).map((reservation) => (
                    <article className="reservation" key={reservation.id}>
                      <i>{reservation.kind === "Flight" ? <Plane size={18} /> : reservation.kind === "Hotel" ? <HotelIcon size={18} /> : reservation.kind === "Dining" ? <Utensils size={18} /> : reservation.kind === "Tickets" ? <Tickets size={18} /> : <Car size={18} />}</i>
                      <div><small>{reservation.kind} · {reservation.date} · {friendlyTime(reservation.time)}{reservation.arrivalTime ? ` → ${friendlyTime(reservation.arrivalTime)}` : ""}</small><b>{reservation.flightNumber ? <><a className="flight-number" href={flightStatusUrl(reservation.flightNumber)} target="_blank" rel="noreferrer">{reservation.flightNumber} ↗</a> · </> : ""}{reservation.title}</b><span>{reservation.location}</span></div>
                      <div className={`confirmation ${reservation.confirmation ? "confirmed" : "missing"}`}><small>CONFIRMATION</small><b>{reservation.confirmation || "Add number"}</b></div>
                      <button aria-label={`Remove ${reservation.title}`} onClick={() => setReservations((items) => items.filter((item) => item.id !== reservation.id))}>×</button>
                    </article>
                  )) : <Empty text="Add flights, stays, dining, tickets, or transport." />}
                </section>
              </div>
              <div className="hub-side">
                <section className="card notes-card">
                  <Title over="KEEP HANDY" title="Important notes" />
                  <textarea value={tripNotes} onChange={(event) => setTripNotes(event.target.value)} placeholder="Emergency contacts, allergies, accessibility needs, hotel address, meetup rules…" />
                  <small>Saved to the shared planner database.</small>
                </section>
                <section className="card links-card">
                  <Title over="DOCUMENTS & LINKS" title="Quick access" action={<button onClick={() => setModal("link")}><CirclePlus size={16} /> Link</button>} />
                  {tripLinks.length ? tripLinks.map((link) => <div key={link.id}><a href={link.url} target="_blank" rel="noreferrer"><i><ExternalLink size={14} /></i><span>{link.label}</span></a><button aria-label={`Remove ${link.label}`} onClick={() => setTripLinks((items) => items.filter((item) => item.id !== link.id))}>×</button></div>) : <Empty text="Save tickets, maps, menus, or shared documents." />}
                </section>
                <button className="ai-card" onClick={() => setModal("assistant")}><i><WandSparkles size={18} /></i><span><small>MIAKI ASSISTANT</small><b>Check my trip</b><p>Find gaps, conflicts, and things you may have forgotten.</p></span><strong>→</strong></button>
                <section className="card travel-tools">
                  <Title over="TAKE IT WITH YOU" title="Trip tools" />
                  <button onClick={() => window.print()}><i><Printer size={17} /></i><span><b>Print trip</b><small>Create a clean paper or PDF copy</small></span></button>
                  <button onClick={downloadTripBackup}><i><Download size={17} /></i><span><b>Download backup</b><small>Save all planner data as JSON</small></span></button>
                </section>
              </div>
            </section>
          </div>
        )}
        {tab === "Expenses" && (
          <div className="page">
            <section className="money-stats">
              <div>
                <small>TOTAL SPENT</small>
                <b>{cash(spent)}</b>
                <span>{expenses.length} purchases</span>
                <button onClick={() => setModal("expense")}><CirclePlus size={16} /> Add expense</button>
              </div>
            </section>
            <section className="expense-layout">
              <div>
                <section className="card balances">
                  <Title over="BALANCE" title="Who owes whom" />
                  {accounts.payments.length ? (
                    accounts.payments.map((s) => (
                      <SettlementRow key={`${s.from.id}-${s.to.id}`} s={s} />
                    ))
                  ) : (
                    <Empty text="Everyone is settled up." />
                  )}
                </section>
              </div>
              <section className="card expenses">
                <Title over="ALL PURCHASES" title="Expense history" />
                {expenses.map((e) => (
                  <div className="expense" key={e.id}>
                    <i>{e.category === "Food" ? <Utensils size={17} /> : e.category === "Transport" ? <TrainFront size={17} /> : e.category === "Activities" ? <Tickets size={17} /> : e.category === "Stay" ? <HotelIcon size={17} /> : <ShoppingBag size={17} />}</i>
                    <div>
                      <b>{e.name}</b>
                      <small>
                        Paid by {pname(e.paidBy)} · split {e.splitWith.length}{" "}
                        ways
                      </small>
                      {e.notes && <em className="expense-note">{e.notes}</em>}
                    </div>
                    <strong>{cash(e.amount)}</strong>
                    <button className="edit" aria-label={`Edit ${e.name}`} onClick={() => { setEditing({ type: "expense", item: e }); setModal("expense"); }}><Pencil size={15} /></button>
                    <button
                      aria-label={`Delete ${e.name}`}
                      onClick={() =>
                        setExpenses((v) => v.filter((x) => x.id !== e.id))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </section>
            </section>
          </div>
        )}
        {tab === "Packing" && (
          <div className="page">
            <div className="packing-overview">
              <section className="pack-status">
                <h2>
                  {Math.round((packed.length / packing.length) * 100) || 0}%
                  packed
                </h2>
                <p>
                  {packing.length - packed.length} things left. You’ve got this!
                </p>
                <Progress n={(packed.length / packing.length) * 100} />
                <button className="pack-add" onClick={() => setModal("packing")}><CirclePlus size={16} /> Add packing item</button>
              </section>
            </div>
            <section className="traveler-packing-grid">
              {!people.length && <section className="card packing-no-travelers"><Users size={28} /><h3>Add travelers first</h3><p>Each packing item belongs to someone on this trip.</p><button className="soft" onClick={() => setModal("person")}>Add a traveler</button></section>}
              {[...people.map((person) => ({ id: person.id, name: person.name, person })), ...(packing.some((item) => !people.some((person) => person.id === item.ownerId)) ? [{ id: 0, name: "Unassigned", person: null }] : [])].map((owner) => {
                const items = packing.filter((item) => owner.id === 0 ? !people.some((person) => person.id === item.ownerId) : item.ownerId === owner.id);
                const completed = items.filter((item) => packed.includes(item.id)).length;
                return (
                  <section className="card traveler-pack-card" key={owner.id}>
                    <header>
                      {owner.person ? <Avatar p={owner.person} /> : <i className="unassigned-avatar">?</i>}
                      <div><h3>{owner.name}</h3><span>{completed} of {items.length} packed</span></div>
                      <strong>{items.length ? Math.round((completed / items.length) * 100) : 0}%</strong>
                    </header>
                    <Progress n={items.length ? (completed / items.length) * 100 : 0} />
                    <div className="pack-list">
                      {items.length ? items.map((item) => (
                        <label className={packed.includes(item.id) ? "packed" : ""} key={item.id}>
                          <input type="checkbox" checked={packed.includes(item.id)} onChange={() => setPacked((value) => value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id])} />
                          <span>{item.text}</span>
                          <small>{packed.includes(item.id) ? "Packed" : "To pack"}</small>
                          <button className="edit" aria-label={`Edit ${item.text}`} onClick={(event) => { event.preventDefault(); setEditing({ type: "packing", item }); setModal("packing"); }}><Pencil size={14} /></button>
                          <button aria-label={`Remove ${item.text}`} onClick={(event) => { event.preventDefault(); setPacking((value) => value.filter((entry) => entry.id !== item.id)); setPacked((value) => value.filter((id) => id !== item.id)); }}>×</button>
                        </label>
                      )) : <Empty text={`${owner.name} hasn’t added anything yet.`} />}
                    </div>
                  </section>
                );
              })}
            </section>
          </div>
        )}
        {tab === "Audit Log" && (
          <div className="page audit-page">
            <section className="audit-summary">
              <div><ClipboardList size={22} /><span><small>TRIP ACTIVITY</small><b>{auditLog.length}</b></span></div>
              <p>A shared record of changes made to {tripName}. New activity is saved with this trip.</p>
            </section>
            <section className="card audit-card">
              <div className="audit-head"><div><small>RECENT CHANGES</small><h2>Audit log</h2></div><span>Newest first</span></div>
              {auditLog.length ? <div className="audit-list">{auditLog.map((entry) => (
                <article className="audit-entry" key={entry.id}>
                  <i className={`audit-icon ${entry.category.toLowerCase()}`}><ClipboardList size={16} /></i>
                  <div><span><em>{entry.category}</em><strong>{entry.action}</strong></span><h3>{entry.detail}</h3><p>{entry.actor}</p></div>
                  <time dateTime={new Date(entry.at).toISOString()}>{new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(entry.at)}</time>
                </article>
              ))}</div> : <div className="audit-empty"><ClipboardList size={28} /><h3>No recorded changes yet</h3><p>New itinerary, expense, traveler, and packing changes will appear here automatically.</p></div>}
            </section>
          </div>
        )}
        {tab === "Notes" && <Notes key={activeTripId} tripId={activeTripId} value={tripNotes} onChange={setTripNotes} syncStatus={syncStatus} />}
        {tab === "Mia Budget" && <Budget value={budget} onChange={setBudget} />}
      </section>
      {modal && (
        <div
          className="backdrop"
          role="button"
          tabIndex={0}
          aria-label="Close dialog"
          onKeyDown={(event) => { if (event.key === "Escape") setModal(null); }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="close" aria-label="Close dialog" onClick={() => setModal(null)}>
              <X size={19} />
            </button>
            {modalCopy?.[0] && <small>{modalCopy[0]}</small>}
            <h2 id="modal-title">{modalCopy?.[1]}</h2>
            {modalCopy?.[2] && <p>{modalCopy[2]}</p>}
            {modal === "plan" ? (
              <form key={editing ? `${editing.type}-${editing.item.id}` : "new-plan"} onSubmit={addPlan}>
                <label>
                  What are you adding?
                  <select name="kind" value={entryKind} onChange={(event) => setEntryKind(event.target.value as Plan["type"] | Reservation["kind"])}>
                    <option>Activity</option><option>Travel</option><option>Food</option><option>Flight</option><option>Hotel</option><option>Dining</option><option>Tickets</option><option>Transport</option><option>Other</option>
                  </select>
                </label>
                <Field
                  name="title"
                  label={entryKind === "Flight" ? "Flight name" : entryKind === "Hotel" ? "Hotel name" : `${entryKind} name`}
                  placeholder={entryKind === "Flight" ? "e.g. Honolulu to Tokyo" : entryKind === "Hotel" ? "e.g. Shinjuku hotel" : "e.g. Sunset picnic"}
                  defaultValue={editing?.type === "plan" || editing?.type === "reservation" ? editing.item.title : ""}
                />
                <div className="formrow">
                  <Field
                    name="date"
                    label="Date"
                    type="date"
                    defaultValue={editing?.type === "plan" || editing?.type === "reservation" ? editing.item.date : planDefaultDate || todayKey}
                  />
                  <Field name="time" label="Time (optional)" required={false} placeholder="e.g. 8:30 AM" defaultValue={editing?.type === "plan" || editing?.type === "reservation" ? friendlyTime(editing.item.time) : ""} />
                </div>
                {entryKind === "Activity" || entryKind === "Travel" || entryKind === "Food" ? <Field name="place" label="Place (optional)" placeholder="Add one if it helps" required={false} defaultValue={editing?.type === "plan" ? editing.item.place : ""} /> : <>
                  <Field name="location" label={entryKind === "Flight" ? "Route or airports (optional)" : "Location (optional)"} placeholder={entryKind === "Flight" ? "e.g. HNL to NRT" : "Address or venue"} required={false} defaultValue={editing?.type === "reservation" ? editing.item.location : ""} />
                  {entryKind === "Flight" && <div className="formrow"><Field name="flightNumber" label="Flight number (optional)" placeholder="e.g. NH181" required={false} defaultValue={editing?.type === "reservation" ? editing.item.flightNumber : ""} /><Field name="arrivalTime" label="Arrival time (optional)" required={false} placeholder="e.g. 4:15 PM" defaultValue={editing?.type === "reservation" ? friendlyTime(editing.item.arrivalTime || "") : ""} /></div>}
                  <Field name="confirmation" label="Confirmation number (optional)" placeholder="Booking reference" required={false} defaultValue={editing?.type === "reservation" ? editing.item.confirmation : ""} />
                </>}
                <div className="itinerary-form-actions">
                  <button className="primary">{editing ? "Save changes" : "Add to itinerary"}</button>
                  {(editing?.type === "plan" || editing?.type === "reservation") && <button type="button" className="delete-itinerary" onClick={deleteEditingItinerary}><Trash2 size={16} /> Delete itinerary item</button>}
                </div>
              </form>
            ) : modal === "person" ? (
              <div className="traveler-manager">
                <div className="traveler-list">
                  {people.map((person) => (
                    <div className="traveler-item" key={person.id}>
                      <Avatar p={person} />
                      <b>{person.name}</b>
                      <button type="button" className="edit" aria-label={`Edit ${person.name}`} title={`Edit ${person.name}`} onClick={() => setEditing({ type: "person", item: person })}><Pencil size={17} /></button>
                      <button
                        type="button"
                        aria-label={`Remove ${person.name}`}
                        title={people.length <= 1 ? "Keep at least one traveler" : `Remove ${person.name}`}
                        disabled={people.length <= 1}
                        onClick={() => requestRemovePerson(person)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
                <form key={editing?.type === "person" ? editing.item.id : "new-person"} onSubmit={addPerson}>
                  <Field
                    name="name"
                    label="Traveler name"
                    placeholder="e.g. Jamie"
                    defaultValue={editing?.type === "person" ? editing.item.name : ""}
                  />
                  <button className="primary">{editing?.type === "person" ? "Save traveler" : "Add traveler"}</button>
                </form>
              </div>
            ) : modal === "reservation" ? (
              <form onSubmit={addReservation}>
                <div className="formrow">
                  <label>Type<select name="kind"><option>Flight</option><option>Hotel</option><option>Dining</option><option>Tickets</option><option>Transport</option><option>Other</option></select></label>
                  <Field name="title" label="Reservation name" placeholder="e.g. Hotel check-in" />
                </div>
                <div className="formrow">
                  <Field name="date" label="Date" type="date" defaultValue={todayKey} />
                  <Field name="time" label="Time" placeholder="e.g. 8:30 AM" />
                </div>
                <div className="formrow">
                  <Field name="flightNumber" label="Flight number (optional)" required={false} placeholder="e.g. NH181" />
                  <Field name="arrivalTime" label="Arrival time (optional)" required={false} placeholder="e.g. 4:15 PM" />
                </div>
                <Field name="location" label="Location" placeholder="Address, airport, or venue" />
                <Field name="confirmation" label="Confirmation number (optional)" required={false} placeholder="Booking reference" />
                <button className="primary">Save booking</button>
              </form>
            ) : modal === "trip" ? (
              <form onSubmit={addTrip}>
                <Field name="name" label="Trip name" placeholder="e.g. Japan Winter 2026" />
                <div className="trip-name-ideas">
                  <small>Try a clear name you’ll recognize later</small>
                  <span>Japan Winter 2026</span><span>Vegas Weekend</span><span>Disneyland Summer</span>
                </div>
                <button className="primary"><CirclePlus size={17} /> Create trip</button>
              </form>
            ) : modal === "link" ? (
              <form key={editing?.type === "link" ? editing.item.id : "new-link"} onSubmit={addLink}>
                <Field name="label" label="Link name" placeholder="e.g. Disneyland tickets" defaultValue={editing?.type === "link" ? editing.item.label : ""} />
                <Field name="url" label="Web address" type="url" placeholder="https://…" defaultValue={editing?.type === "link" ? editing.item.url : ""} />
                <button className="primary"><ExternalLink size={17} /> {editing?.type === "link" ? "Save changes" : "Save link"}</button>
              </form>
            ) : modal === "packing" ? (
              <form key={editing?.type === "packing" ? editing.item.id : "new-packing"} onSubmit={addPackingItem}>
                <Field name="item" label="What should we bring?" placeholder="e.g. Portable phone charger" defaultValue={editing?.type === "packing" ? editing.item.text : ""} />
                <label>Who is packing it?
                  <select name="ownerId" required defaultValue={editing?.type === "packing" ? editing.item.ownerId : people[0]?.id || ""}>
                    {!people.length && <option value="">Add a traveler first</option>}
                    {people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
                  </select>
                </label>
                <button className="primary" disabled={!people.length}><Luggage size={17} /> {editing?.type === "packing" ? "Save changes" : "Add to their list"}</button>
              </form>
            ) : modal === "assistant" ? (
              <div className="assistant-panel">
                <div className="prompt-chips">
                  {["What am I forgetting?", "Find schedule problems", "Make today easier", "Check our bookings"].map((prompt) => <button key={prompt} onClick={() => setAiQuestion(prompt)}>{prompt}</button>)}
                </div>
                <form onSubmit={askAssistant}>
                  <label>Ask about this trip<textarea value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} placeholder="What should we double-check before leaving?" required /></label>
                  <button className="primary" disabled={aiBusy}>{!aiBusy && <WandSparkles size={16} />}{aiBusy ? "Checking your trip…" : "Ask Miaki"}</button>
                </form>
                {aiAnswer && <div className="assistant-answer"><i><WandSparkles size={16} /></i><p>{aiAnswer}</p></div>}
                <small className="assistant-note">Live details like hours, prices, weather, and flight status should always be verified with official providers.</small>
              </div>
            ) : (
              <form key={editing?.type === "expense" ? editing.item.id : "new-expense"} onSubmit={addExpense}>
                <Field
                  name="name"
                  label="What was it?"
                  placeholder="e.g. Dinner"
                  defaultValue={editing?.type === "expense" ? editing.item.name : ""}
                />
                <div className="formrow">
                  <Field
                    name="amount"
                    label="Amount (USD)"
                    type="number"
                    step="0.01"
                    defaultValue={editing?.type === "expense" ? String(editing.item.amount) : ""}
                  />
                  <Field
                    name="date"
                    label="Date"
                    type="date"
                    defaultValue={editing?.type === "expense" ? editing.item.date : todayKey}
                  />
                </div>
                <div className="formrow">
                  <label>
                    Paid by
                    <select name="paidBy" defaultValue={editing?.type === "expense" ? editing.item.paidBy : people[0]?.id}>
                      {people.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Category
                    <select name="category" defaultValue={editing?.type === "expense" ? editing.item.category : "Food"}>
                      <option>Food</option>
                      <option>Transport</option>
                      <option>Activities</option>
                      <option>Stay</option>
                      <option>Shopping</option>
                      <option>Other</option>
                    </select>
                  </label>
                </div>
                <fieldset>
                  <legend>Split with</legend>
                  <div className="split-people">
                    {people.map((p) => (
                      <label key={p.id}>
                        <input
                          type="checkbox"
                          name="splitWith"
                          value={p.id}
                          defaultChecked={editing?.type === "expense" ? editing.item.splitWith.includes(p.id) : true}
                        />
                        <Avatar p={p} />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field name="notes" label="Notes (optional)" required={false} placeholder="Anything useful to remember" defaultValue={editing?.type === "expense" ? editing.item.notes : ""} />
                <button className="primary">{editing?.type === "expense" ? "Save changes" : "Save & split expense"}</button>
              </form>
            )}
          </div>
        </div>
      )}
      {confirming && (
        <div className="backdrop confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(null); }} onKeyDown={(event) => { if (event.key === "Escape") setConfirming(null); }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
            <button className="confirm-close" aria-label="Never mind and close" onClick={() => setConfirming(null)}><X size={18} /></button>
            <i className="confirm-warning"><AlertTriangle size={24} /></i>
            <small>PLEASE DOUBLE-CHECK</small>
            <h2 id="confirm-title">{confirming.type === "trip" ? `Delete “${tripName}”?` : `Remove ${confirming.item.name}?`}</h2>
            <p id="confirm-description">{confirming.type === "trip" ? "This removes the entire trip and everything saved inside it from the shared planner." : "This traveler will be removed from the trip. Their paid expenses will also be removed, and their packing items will become unassigned."}</p>
            {confirming.type === "trip" ? <div className="confirm-impact">
              <span><b>{plans.length + reservations.length}</b> itinerary items</span><span><b>{expenses.length}</b> expenses</span><span><b>{people.length}</b> travelers</span><span><b>{packing.length}</b> packing items</span>
            </div> : <div className="confirm-impact person-impact">
              <span><b>{expenses.filter((expense) => expense.paidBy === confirming.item.id).length}</b> paid expenses removed</span><span><b>{packing.filter((item) => item.ownerId === confirming.item.id).length}</b> packing items unassigned</span>
            </div>}
            <div className="confirm-actions">
              <button className="cancel" autoFocus onClick={() => setConfirming(null)}>Never mind</button>
              <button className="danger" onClick={() => { if (confirming.type === "trip") removeCurrentTrip(); else removePerson(confirming.item); setConfirming(null); }}><Trash2 size={17} /> {confirming.type === "trip" ? "Delete trip" : "Remove traveler"}</button>
            </div>
          </section>
        </div>
      )}
      {!modal && !confirming && (
        <button className="ai-fab" onClick={() => setModal("assistant")}>
          <i><WandSparkles size={16} /></i><span>Ask Miaki</span>
        </button>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
      <nav className="mobile-nav">
        {nav.map((n, i) => (
          <button
            className={tab === n ? "active" : ""}
            key={n}
            onClick={() => setTab(n)}
          >
              <span>{[<Compass key="o" />, <CalendarDays key="i" />, <BadgeDollarSign key="e" />, <Luggage key="p" />, <NotebookPen key="n" />, <ClipboardList key="a" />, <WalletCards key="b" />][i]}</span>
            {n}
          </button>
        ))}
      </nav>
    </main>
  );
}
function Title({
  over,
  title,
  sub,
  action,
  big,
}: {
  over: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  big?: boolean;
}) {
  return (
    <div className={`title ${big ? "big" : ""}`}>
      <div>
        <small>{over}</small>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <article>
      <i>{icon}</i>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <p>{sub}</p>
      </div>
    </article>
  );
}
function Progress({ n }: { n: number }) {
  return (
    <div className="progress">
      <i
        style={{
          width: `${Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0))}%`,
        }}
      />
    </div>
  );
}
function Field({
  name,
  label,
  type = "text",
  placeholder,
  step,
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  step?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}
function Avatar({ p }: { p: Person }) {
  const blue = palette[Math.abs(Number(p.id) || 0) % palette.length];
  return (
    <i className="avatar" style={{ background: blue }}>
      {p.name.slice(0, 2).toUpperCase()}
    </i>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Sparkles size={17} /><span>{text}</span>
    </div>
  );
}
function PlanRow({ p }: { p: Plan }) {
  return (
    <div className="next">
      <div className="date">
        <b>{new Date(p.date + "T12:00").getDate()}</b>
        <small>
          {new Date(p.date + "T12:00").toLocaleString("en", { month: "short" })}
        </small>
      </div>
      <i className={p.type} />
      <div>
        <b>{p.title}</b>
        <small>{friendlyTime(p.time)} · {p.mapUrl ? <a href={p.mapUrl} target="_blank" rel="noreferrer">{p.place} ↗</a> : p.place}</small>
      </div>
      <span>{p.type}</span>
    </div>
  );
}
function SettlementRow({ s }: { s: Payment }) {
  return (
    <div className="settlement">
      <Avatar p={s.from} />
      <div>
        <b>
          {s.from.name} <span>pays</span> {s.to.name}
        </b>
        <small>{s.from.name} owes {s.to.name}</small>
      </div>
      <strong>{cash(s.amount)}</strong>
      <span className="arrow">→</span>
      <Avatar p={s.to} />
    </div>
  );
}

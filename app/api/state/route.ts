import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ec2Origin = process.env.EC2_API_ORIGIN?.replace(/\/$/, "");

async function proxyToEc2(request: Request, body?: string) {
  if (!ec2Origin) return null;
  try {
    const response = await fetch(`${ec2Origin}/api/state`, {
      method: request.method,
      headers: {
        "content-type": "application/json",
        "x-miaki-api-key": process.env.DB_API_SECRET || "",
      },
      body: request.method === "PUT" ? (body ?? await request.text()) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Shared EC2 database is temporarily unreachable." }, { status: 503 });
  }
}

function isAuthorized(request: Request) {
  return !process.env.DB_API_SECRET || request.headers.get("x-miaki-api-key") === process.env.DB_API_SECRET;
}

const initialState = {
  tripName: "Our next adventure",
  plans: [],
  people: [
    { id: 1, name: "Mia", color: "#ed7078" },
    { id: 2, name: "Taiki", color: "#68a993" },
  ],
  expenses: [],
  reservations: [],
  decisions: [],
  tripLinks: [],
  tripNotes: "",
  packing: [],
  packed: [],
  timezone: "Pacific/Honolulu",
};

export async function GET(request: Request) {
  const proxied = await proxyToEc2(request);
  if (proxied) return proxied;
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { getDb } = await import("@/db/shared");
  const db = getDb();
  let row = db.prepare("SELECT value, updated_at AS updatedAt FROM shared_state WHERE id = 1").get() as
    | { value: string; updatedAt: number }
    | undefined;
  if (!row) {
    const updatedAt = Date.now();
    const value = JSON.stringify(initialState);
    db.prepare("INSERT INTO shared_state (id, value, updated_at) VALUES (1, ?, ?)").run(value, updatedAt);
    row = { value, updatedAt };
  }
  return NextResponse.json({ state: JSON.parse(row.value), updatedAt: row.updatedAt });
}

export async function PUT(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) {
    return NextResponse.json({ error: "Planner data is too large." }, { status: 413 });
  }
  const requestBody = await request.text();
  let body: { state?: Record<string, unknown> };
  try {
    body = JSON.parse(requestBody);
  } catch {
    return NextResponse.json({ error: "Invalid planner data." }, { status: 400 });
  }
  if (!body?.state || typeof body.state !== "object" || Array.isArray(body.state)) {
    return NextResponse.json({ error: "Invalid planner data." }, { status: 400 });
  }
  if (body.state.version !== 2 || !Array.isArray(body.state.trips)) {
    return NextResponse.json({ error: "This planner tab is outdated. Refresh before saving." }, { status: 409 });
  }
  const proxied = await proxyToEc2(request, requestBody);
  if (proxied) return proxied;
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const updatedAt = Date.now();
  const { getDb } = await import("@/db/shared");
  getDb()
    .prepare("INSERT INTO shared_state (id, value, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(JSON.stringify(body.state), updatedAt);
  return NextResponse.json({ ok: true, updatedAt });
}

import { generateText } from "ai";

export async function POST(request: Request) {
  const { question, context } = await request.json();
  if (!question || typeof question !== "string") {
    return Response.json({ error: "Ask a trip-planning question." }, { status: 400 });
  }
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return Response.json({ configured: false }, { status: 503 });
  }
  try {
    const { text } = await generateText({
      model: "openai/gpt-5.6-luna",
      system:
        "You are Miaki, a concise, practical group-trip planner. Use only the supplied trip context. Flag timing conflicts, missing confirmations, accessibility or child-related considerations, weather-dependent assumptions, and fair group coordination. Never claim live availability, prices, opening hours, flight status, or safety conditions unless present in the context. Give a short prioritized answer with concrete next actions.",
      prompt: `Trip context:\n${JSON.stringify(context)}\n\nTraveler question: ${question}`,
    });
    return Response.json({ configured: true, text });
  } catch (error) {
    console.error("[api/assistant] generation failed", { error: String(error) });
    return Response.json({ configured: true, error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}

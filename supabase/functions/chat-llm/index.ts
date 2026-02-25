// @ts-nocheck – Deno / Supabase Edge Function runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const LLM_API_URL = Deno.env.get("LLM_API_URL") ?? "";
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") ?? "";
const MODEL_NAME = Deno.env.get("MODEL_NAME") ?? "gpt-oss-120b";

const SYSTEM_PROMPT = `You are FitAI, a personal nutrition assistant embedded in a fitness app.
Your job is to help users log their food intake conversationally.

When a user mentions eating or drinking something, extract EVERY food/drink item they mentioned and respond ONLY with a JSON block:
\`\`\`json
{
  "mode": "extraction",
  "items": [
    { "food_name": "<name>", "quantity": <number>, "unit": "<unit>" },
    ...
  ],
  "message": "<friendly acknowledgment asking the user to confirm>"
}
\`\`\`

Rules for extraction mode:
- food_name: use a generic, recognisable name (e.g. "scrambled eggs", "orange juice")
- quantity: your best estimate of the amount consumed
- unit: grams, ml, cup, piece, slice, tbsp, etc.
- message: short, warm confirmation text

When NO food is mentioned (e.g. the user is asking a general health question), respond with:
\`\`\`json
{
  "mode": "conversation",
  "message": "<your response>"
}
\`\`\`

Be concise, supportive, and non-judgmental about food choices. Never lecture unsolicited.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { session_history = [], user_message } = await req.json();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...session_history,
      { role: "user", content: user_message },
    ];

    const llmResponse = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL_NAME, messages, temperature: 0.2 }),
    });

    if (!llmResponse.ok) {
      const err = await llmResponse.text();
      return new Response(JSON.stringify({ error: err }), { status: 502 });
    }

    const llmData = await llmResponse.json();
    const rawContent: string =
      llmData.choices?.[0]?.message?.content ?? llmData.message?.content ?? "";

    // Extract JSON block from markdown fences if present
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { mode: "conversation", message: rawContent };
    }

    return new Response(JSON.stringify(parsed), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});

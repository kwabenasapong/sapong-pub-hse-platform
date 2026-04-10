import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sample, authorName } = await req.json();
    if (!sample?.trim()) {
      return new Response("Sample text required", { status: 400 });
    }

    const prompt = `You are a publishing editor analysing a preacher's sermon to build their author voice profile.

PREACHER: ${authorName || "Unknown"}

SERMON SAMPLE:
${sample}

Analyse the sermon and produce a structured voice profile. Respond ONLY with valid JSON — no preamble, no markdown fences, no explanation. Use exactly this structure:

{
  "tone": ["descriptor 1", "descriptor 2", "descriptor 3"],
  "style": "One sentence describing the overall preaching and writing style",
  "culturalMarkers": ["marker 1", "marker 2"],
  "culturalBackground": "Brief description of cultural/professional context inferred from the sermon",
  "referenceAuthor": "ONE of: Oyedepo | Adeyemi | Munroe | Ashimolowo — whichever best matches this preacher's style",
  "referenceAuthorReason": "One sentence explaining why this reference author fits",
  "suggestedTranslation": "ONE of: KJV | PASSION | NLT — whichever suits this preacher's tone and Scripture usage",
  "translationReason": "One sentence explaining the translation choice",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "illustrationStyle": "Brief description of how this preacher uses personal stories and illustrations",
  "confidence": "high | medium | low — based on how much the sample reveals"
}

Base everything strictly on what is present in the sermon sample. Do not invent details.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = await anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });

          for await (const chunk of claudeStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`{"error": "${err instanceof Error ? err.message : "Generation failed"}"}`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

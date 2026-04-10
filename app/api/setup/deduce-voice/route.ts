import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "@/lib/config";
import { logAiUsage } from "@/lib/pricing";

// Client instantiated per-request using config

export async function POST(req: NextRequest) {
  try {
    const { sample, authorName, ministryId } = await req.json();
    if (!sample?.trim()) {
      return new Response("Sample text required", { status: 400 });
    }

    const apiKey = await getConfig("anthropicApiKey");
    const model  = await getConfig("anthropicModel");
    const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });

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
            model: model,
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
          // Log usage after stream
          try {
            const finalMsg = await claudeStream.finalMessage();
            const { input_tokens, output_tokens } = finalMsg.usage;
            if (ministryId) {
              await logAiUsage({
                ministryId,
                stepType: "voice_deduction",
                model,
                inputTokens:  input_tokens,
                outputTokens: output_tokens,
              });
            }
          } catch { /* never break the stream */ }
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

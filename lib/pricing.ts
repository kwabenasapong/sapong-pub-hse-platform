import { prisma } from "./prisma";
// ── Sonnet 4 pricing (USD per 1M tokens) ─────────────────────────────────────
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6":          { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-20250514":   { input: 3.00,  output: 15.00 },
  "claude-opus-4-6":            { input: 15.00, output: 75.00 },
  "claude-haiku-4-5-20251001":  { input: 0.80,  output: 4.00  },
};

const DEFAULT_PRICING = { input: 3.00, output: 15.00 };

export function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? DEFAULT_PRICING;
  return (inputTokens / 1_000_000) * pricing.input
       + (outputTokens / 1_000_000) * pricing.output;
}

export function formatUsd(amount: number): string {
  return "$" + amount.toFixed(4);
}

export function formatGhs(amount: number, rate: number): string {
  return "GHS " + (amount * rate).toFixed(2);
}

// ── Write a usage log record ──────────────────────────────────────────────────
export async function logAiUsage(params: {
  ministryId: string;
  authorId?: string;
  bookId?: string;
  stepType: "analysis" | "outline" | "chapter_draft" | "front_back_matter" | "voice_deduction";
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    const costUsd = calcCostUsd(params.model, params.inputTokens, params.outputTokens);
    await prisma.aiUsageLog.create({
      data: {
        ministryId:   params.ministryId,
        authorId:     params.authorId ?? null,
        bookId:       params.bookId ?? null,
        stepType:     params.stepType,
        model:        params.model,
        inputTokens:  params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd:      costUsd,
      },
    });
  } catch (err) {
    // Never let logging failure break the main workflow
    console.error("AI usage log failed:", err);
  }
}

// ── Map step number to step type label ────────────────────────────────────────
export function stepTypeFromNumber(
  stepNumber: number
): "analysis" | "outline" | "chapter_draft" | "front_back_matter" {
  if (stepNumber === 2) return "analysis";
  if (stepNumber === 3) return "outline";
  if (stepNumber === 4) return "chapter_draft";
  return "front_back_matter";
}

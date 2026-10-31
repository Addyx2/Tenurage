import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlockParam, BetaMessageParam, BetaToolResultBlockParam, BetaToolUnion } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";

// One tool-using turn with Claude, shared by Linkbot (applicants and office)
// and Bot. Tools validate their input before they run; the caller decides
// what each tool may do. Returns what the model said last.

export const MODEL = "claude-opus-5-5";

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export interface Tool<C> {
  description: string;
  input: { zod: z.ZodTypeAny; json: Record<string, unknown> };
  run: (input: Record<string, unknown>, ctx: C) => Promise<unknown>;
}

export async function aiTurn<C>(opts: {
  system: string;
  messages: BetaMessageParam[];
  tools: Record<string, Tool<C>>;
  ctx: C;
  maxCalls?: number;
  onToolResult?: (name: string, content: string, isError: boolean) => void;
}): Promise<string | null> {
  const client = new Anthropic({ maxRetries: 2, timeout: 30_000 });
  const messages = [...opts.messages];
  const tools = Object.entries(opts.tools).map(([name, t]) => ({ name, description: t.description, input_schema: t.input.json, strict: true }) as BetaToolUnion);
  let said: string | null = null;
  for (let call = 0; call < (opts.maxCalls ?? 5); call++) {
    const message = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: message.content as BetaContentBlockParam[] });
    if (message.stop_reason === "refusal") return null;
    const text = message.content.flatMap((b) => (b.type === "text" && b.text.trim() ? [b.text.trim()] : [])).join(" ");
    if (text) said = text;
    const uses = message.content.filter((b) => b.type === "tool_use");
    if (uses.length === 0 || message.stop_reason === "max_tokens") break;
    const results: BetaToolResultBlockParam[] = [];
    for (const use of uses) {
      if (use.type !== "tool_use") continue;
      const tool = opts.tools[use.name];
      const parsed = tool?.input.zod.safeParse(use.input ?? {});
      let content: string;
      let isError = false;
      if (!tool) {
        content = `${use.name} can't be used here.`;
        isError = true;
      } else if (!parsed?.success) {
        content = `Invalid input: ${parsed?.error?.issues.map((i) => i.message).join("; ")}`;
        isError = true;
      } else {
        try {
          content = JSON.stringify((await tool.run(parsed.data as Record<string, unknown>, opts.ctx)) ?? null).slice(0, 20_000);
        } catch (error) {
          console.error("tool failed", use.name, error);
          content = "That didn't work.";
          isError = true;
        }
      }
      opts.onToolResult?.(use.name, content, isError);
      results.push({ type: "tool_result", tool_use_id: use.id, content, ...(isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }
  return said;
}

/** Recent texts or chat lines as alternating turns, starting with the person. */
export function asTurns(lines: { fromPerson: boolean; body: string }[]): BetaMessageParam[] {
  const turns: BetaMessageParam[] = [];
  for (const l of lines) {
    const role = l.fromPerson ? "user" : "assistant";
    const last = turns.at(-1);
    if (last && last.role === role) last.content = `${last.content as string}\n${l.body}`;
    else turns.push({ role, content: l.body });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

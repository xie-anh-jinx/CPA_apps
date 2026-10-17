/**
 * CPA Platform — AI Chat Client (siap untuk integrasi LLM + MCP)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Komponen UI (`components/ai/AIChatBox.tsx`) hanya berbicara dengan modul ini.
 * Untuk menghubungkan ke LLM sungguhan cukup implementasikan endpoint backend
 * berikut — UI tidak perlu diubah.
 *
 *   POST  {NEXT_PUBLIC_AI_CHAT_ENDPOINT || "/api/ai/chat"}
 *   Headers : Authorization: Bearer <cpa_token>
 *             Accept: text/event-stream, application/json
 *   Body    : {
 *               "messages": [{ "role": "user"|"assistant", "content": "...",
 *                              "attachments": [{ name, type, size, dataUrl? }] }],
 *               "context":  { "page": "dashboard", "path": "/", "role": "admin", ... },
 *               "stream":   true
 *             }
 *
 *   Respons A — streaming (disarankan), `Content-Type: text/event-stream`.
 *   Setiap event berupa satu baris `data: <json>`:
 *     data: {"type":"token","content":"Omzet bulan ini "}
 *     data: {"type":"tool_call","id":"t1","name":"get_sales_summary","args":{},"status":"running"}
 *     data: {"type":"tool_result","id":"t1","status":"done","summary":"38 faktur"}
 *     data: {"type":"error","message":"..."}
 *     data: {"type":"done"}            (atau: data: [DONE])
 *
 *   Respons B — non-streaming, `Content-Type: application/json`:
 *     { "content": "...", "tool_calls": [{ "id": "t1", "name": "get_sales_summary" }] }
 *
 * Di sisi backend, endpoint tersebut cukup:
 *   1. Mengambil daftar tool dari MCP server (`tools/list`, sudah RBAC per role user).
 *   2. Mengirim percakapan + tools ke LLM (Gemini / OpenAI / Claude / DeepSeek).
 *   3. Mengeksekusi `tools/call` ke MCP setiap kali LLM meminta, lalu
 *      mem-forward progresnya sebagai event `tool_call` / `tool_result`.
 *   4. Men-stream jawaban akhir sebagai event `token`.
 *
 * Selama endpoint belum tersedia (404/405/501/502/503 atau network error),
 * modul ini otomatis berpindah ke **Mode Demo** yang mensimulasikan alur di atas.
 * Paksa mode demo dengan `NEXT_PUBLIC_AI_CHAT_DEMO=true`.
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type ChatRole = "user" | "assistant";

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Data URL (base64) — hanya diisi untuk gambar berukuran kecil. */
  dataUrl?: string;
}

export type ToolCallStatus = "running" | "done" | "error";

export interface ToolCallInfo {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status: ToolCallStatus;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  attachments?: ChatAttachment[];
  toolCalls?: ToolCallInfo[];
  status?: "streaming" | "done" | "error";
}

export type ChatStreamEvent =
  | { type: "token"; content: string }
  | {
      type: "tool_call";
      id: string;
      name: string;
      args?: Record<string, unknown>;
      status?: ToolCallStatus;
    }
  | { type: "tool_result"; id: string; status: ToolCallStatus; summary?: string }
  | { type: "error"; message: string }
  | { type: "done" };

export type ChatMode = "live" | "demo";

export interface StreamChatOptions {
  messages: ChatMessage[];
  context?: Record<string, unknown>;
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────
export const AI_CHAT_ENDPOINT =
  process.env.NEXT_PUBLIC_AI_CHAT_ENDPOINT || "/api/ai/chat";

const FORCE_DEMO = process.env.NEXT_PUBLIC_AI_CHAT_DEMO === "true";

/** Status HTTP yang dianggap "endpoint belum tersedia" → fallback ke demo. */
const FALLBACK_STATUSES = new Set([404, 405, 501, 502, 503, 504]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function createId(prefix = "m"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("cpa_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toPayload(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.status !== "error" && (m.content || m.attachments?.length))
    .map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.attachments?.length
        ? {
            attachments: m.attachments.map(({ name, type, size, dataUrl }) => ({
              name,
              type,
              size,
              ...(dataUrl ? { dataUrl } : {}),
            })),
          }
        : {}),
    }));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

async function readErrorDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
  } catch {
    /* ignore */
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Kirim percakapan ke AI dan terima jawabannya sebagai rangkaian event.
 * Mengembalikan mode yang dipakai ("live" bila backend menjawab, "demo" bila fallback).
 */
export async function streamChat({
  messages,
  context,
  signal,
  onEvent,
}: StreamChatOptions): Promise<ChatMode> {
  if (!FORCE_DEMO) {
    let res: Response | null = null;
    try {
      res = await fetch(AI_CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ messages: toPayload(messages), context, stream: true }),
        signal,
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      res = null; // network error → fallback demo
    }

    if (res?.ok) {
      await consumeResponse(res, onEvent);
      return "live";
    }
    if (res?.status === 401) {
      throw new Error("Sesi Anda telah berakhir. Silakan login ulang.");
    }
    if (res?.status === 403) {
      throw new Error(
        (await readErrorDetail(res)) || "Role Anda tidak memiliki akses ke AI Assistant."
      );
    }
    if (res && !FALLBACK_STATUSES.has(res.status)) {
      throw new Error((await readErrorDetail(res)) || `AI service error (${res.status}).`);
    }
  }

  await runDemo(messages, onEvent, signal);
  return "demo";
}

// ─── Response parsing (SSE / JSON) ────────────────────────────────────────────
async function consumeResponse(res: Response, onEvent: (e: ChatStreamEvent) => void) {
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("text/event-stream") || !res.body) {
    const data = await res.json().catch(() => ({}));
    const toolCalls: Array<{ id?: string; name: string; args?: Record<string, unknown> }> =
      Array.isArray(data?.tool_calls) ? data.tool_calls : [];
    toolCalls.forEach((tc, i) =>
      onEvent({
        type: "tool_call",
        id: tc.id ?? `${tc.name}_${i}`,
        name: tc.name,
        args: tc.args,
        status: "done",
      })
    );
    const content = data?.content ?? data?.message ?? data?.answer ?? "";
    if (content) onEvent({ type: "token", content: String(content) });
    onEvent({ type: "done" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let match: RegExpExecArray | null;
    while (!finished && (match = /\r?\n\r?\n/.exec(buffer))) {
      const rawEvent = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);

      const data = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n");
      if (!data) continue;
      if (data === "[DONE]") {
        finished = true;
        break;
      }

      try {
        const evt = JSON.parse(data) as ChatStreamEvent;
        if (evt.type === "done") {
          finished = true;
          break;
        }
        onEvent(evt);
      } catch {
        // Payload bukan JSON → anggap token teks mentah.
        onEvent({ type: "token", content: data });
      }
    }
  }

  if (finished) reader.cancel().catch(() => undefined);
  onEvent({ type: "done" });
}

// ─── Demo mode ────────────────────────────────────────────────────────────────
interface DemoTool {
  match: RegExp;
  name: string;
  label: string;
}

/** Pemetaan kata kunci → tool MCP yang tersedia di `backend/app/mcp`. */
const DEMO_TOOLS: DemoTool[] = [
  { match: /(kritis|menipis|habis|low.?stock|reorder)/i, name: "get_low_stock_alerts", label: "Alert stok kritis" },
  { match: /(stok|stock|inventor|persediaan|sku)/i, name: "get_inventory_summary", label: "Ringkasan stok & nilai persediaan" },
  { match: /(piutang|aging|receivable|\bar\b|tagihan)/i, name: "get_ar_piutang_aging", label: "Analisa aging piutang 30/60/90+" },
  { match: /(terlaris|top.?(produk|product|selling)|best.?seller)/i, name: "get_top_selling_products", label: "Produk terlaris" },
  { match: /(faktur|invoice)/i, name: "get_invoices", label: "Daftar faktur / invoice" },
  { match: /(omzet|omset|penjualan|sales|revenue|pendapatan)/i, name: "get_sales_summary", label: "Ringkasan penjualan" },
  { match: /(forecast|prediksi|demand|proyeksi|ramal)/i, name: "get_demand_forecast", label: "Prediksi demand AI" },
  { match: /(keluhan|komplain|complain|tiket)/i, name: "get_crm_complaints", label: "Keluhan pelanggan" },
  { match: /(deal|pipeline|opportunit|prospek)/i, name: "get_crm_opportunities", label: "Pipeline deals CRM" },
  { match: /(aktivitas|kunjungan|follow.?up|crm)/i, name: "get_crm_activities", label: "Aktivitas CRM" },
  { match: /(pelanggan|customer|konsumen)/i, name: "get_customer_detail", label: "Profil pelanggan" },
  { match: /(gudang|warehouse)/i, name: "get_warehouse_list", label: "Daftar master gudang" },
];

function buildDemoReply(question: string, attachments: ChatAttachment[], tools: DemoTool[]): string {
  const q = question.trim();

  if (/^(hai|halo|hallo|hi|hello|hey|pagi|siang|sore|malam|assalamu)/i.test(q) && tools.length === 0) {
    return [
      "Halo! 👋 Saya **CPA AI Assistant**.",
      "",
      "Saya dirancang untuk menjawab pertanyaan bisnis Anda langsung dari data ERP melalui **MCP server** CPA, misalnya:",
      "- Ringkasan **omzet & penjualan** per periode",
      "- **Stok kritis** dan nilai persediaan per gudang",
      "- **Aging piutang** dan faktur yang belum lunas",
      "- **Prediksi demand** produk bulan depan",
      "",
      "_Catatan: saat ini berjalan dalam **Mode Demo** — endpoint LLM belum terhubung._",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push("**Mode Demo** — endpoint AI belum terhubung, jadi ini adalah respons simulasi.");
  lines.push("");

  if (attachments.length) {
    lines.push(
      `Saya menerima **${attachments.length} lampiran**: ${attachments
        .map((a) => `\`${a.name}\``)
        .join(", ")}.`
    );
    lines.push("");
  }

  if (tools.length) {
    lines.push(
      q
        ? `Untuk pertanyaan _"${q.length > 90 ? `${q.slice(0, 90)}…` : q}"_, asisten akan memanggil tool MCP berikut:`
        : "Asisten akan memanggil tool MCP berikut:"
    );
    lines.push("");
    lines.push("| Tool MCP | Fungsi |");
    lines.push("|---|---|");
    tools.forEach((t) => lines.push(`| \`${t.name}\` | ${t.label} |`));
    lines.push("");
    lines.push("Hasilnya otomatis difilter oleh **RBAC & Row-Level Security** sesuai role akun Anda.");
  } else if (q) {
    lines.push(
      "Saya belum menemukan tool MCP yang cocok untuk pertanyaan ini. Coba tanyakan seputar **penjualan, stok, piutang, pelanggan, CRM,** atau **forecast**."
    );
  }

  lines.push("");
  lines.push(
    `Setelah backend \`POST ${AI_CHAT_ENDPOINT}\` aktif, jawaban akan berisi data real-time dari ERP. Kontrak integrasinya ada di \`frontend/lib/aiChat.ts\`.`
  );
  return lines.join("\n");
}

async function runDemo(
  messages: ChatMessage[],
  onEvent: (e: ChatStreamEvent) => void,
  signal?: AbortSignal
) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const question = last?.content ?? "";
  const attachments = last?.attachments ?? [];
  const tools = DEMO_TOOLS.filter((t) => t.match.test(question)).slice(0, 3);

  await sleep(450, signal);

  for (const tool of tools) {
    const id = createId("tool");
    onEvent({ type: "tool_call", id, name: tool.name, args: {}, status: "running" });
    await sleep(650 + Math.random() * 500, signal);
    onEvent({ type: "tool_result", id, status: "done", summary: "Simulasi — tidak ada data diambil" });
  }

  const reply = buildDemoReply(question, attachments, tools);
  let i = 0;
  while (i < reply.length) {
    const step = 2 + Math.floor(Math.random() * 4);
    onEvent({ type: "token", content: reply.slice(i, i + step) });
    i += step;
    await sleep(14, signal);
  }
  onEvent({ type: "done" });
}

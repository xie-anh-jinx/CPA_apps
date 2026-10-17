"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Square,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  LoaderCircle,
  CircleAlert,
  CircleCheck,
  Paperclip,
  Minus,
  MessageSquare,
} from "lucide-react";
import {
  streamChat,
  ChatMessage,
  ChatAttachment,
  createId,
  ChatMode,
  ToolCallInfo,
} from "@/lib/aiChat";
import ChatMarkdown from "./ChatMarkdown";
import AIOrb from "./AIOrb";

// ─── Preset Prompts ───────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { label: "Stok Kritis Hari Ini", query: "Tampilkan SKU yang stoknya kritis atau habis di gudang." },
  { label: "Omzet & Faktur YTD", query: "Bagaimana ringkasan omzet penjualan dan faktur YTD 2026?" },
  { label: "Aging Piutang >60 Hari", query: "Analisa piutang yang berumur lebih dari 60 hari." },
  { label: "Prediksi Demand AI", query: "Berikan proyeksi demand produk utama untuk bulan depan." },
];

// ─── PADI AI Logo Component ────────────────────────────────────────────────────
export const PadiAILogo = ({
  size = 18,
  className = "",
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <img
    src="/images/logo-padi-ai.png"
    alt="PADI AI"
    className={className}
    style={{
      height: `${size}px`,
      width: "auto",
      maxWidth: "100%",
      objectFit: "contain",
      display: "inline-block",
      verticalAlign: "middle",
      ...style,
    }}
  />
);

interface AIChatBoxProps {
  /** Mode tampilan: 'inline' untuk di header dashboard, 'floating' untuk melayang di pojok kanan bawah */
  variant?: "inline" | "floating";
  className?: string;
  contextPage?: string;
}

export default function AIChatBox({
  variant = "inline",
  className = "",
  contextPage = "dashboard",
}: AIChatBoxProps) {
  // Input state
  const [inputText, setInputText] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  // Floating dock collapse state
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Drawer / Conversation state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("demo");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("admin");

  // Listen to Sidebar 'Tanya CPA AI' event to open drawer
  useEffect(() => {
    const handleOpenChat = () => {
      setIsDockCollapsed(false);
      setIsDrawerOpen(true);
    };
    window.addEventListener("open-cpa-ai-chat", handleOpenChat);
    return () => window.removeEventListener("open-cpa-ai-chat", handleOpenChat);
  }, []);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeFilterRef = useRef<string>("all");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load user role from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) setUserRole(parsed.role);
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (isDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isDrawerOpen]);

  // Web Speech API initialization
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "id-ID";

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          if (current.trim()) {
            setSpeechTranscript(current);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition notice:", e.error);
        };

        recognition.onend = () => {
          // If state still thinks active, stop voice
          setIsVoiceActive(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("SpeechRecognition init error:", err);
      }
    }
  }, []);

  // Toggle voice conversation
  const handleVoiceToggle = () => {
    const next = !isVoiceActive;
    setIsVoiceActive(next);

    if (next) {
      setSpeechTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        /* recognition might already be running */
      }
    } else {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        /* ignore */
      }
      // If voice captured text, copy into input
      if (speechTranscript.trim()) {
        setInputText(speechTranscript.trim());
      }
    }
  };

  // Trigger file dialog
  const triggerFileSelect = (type: "camera" | "image" | "doc" | "all") => {
    fileTypeFilterRef.current = type;
    if (fileInputRef.current) {
      if (type === "camera") {
        fileInputRef.current.accept = "image/*";
        fileInputRef.current.capture = "environment";
      } else if (type === "image") {
        fileInputRef.current.accept = "image/*";
        fileInputRef.current.removeAttribute("capture");
      } else if (type === "doc") {
        fileInputRef.current.accept = ".pdf,.csv,.xlsx,.xls,.json,.txt,image/*";
        fileInputRef.current.removeAttribute("capture");
      } else {
        fileInputRef.current.accept = "*/*";
        fileInputRef.current.removeAttribute("capture");
      }
      fileInputRef.current.click();
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const newAtt: ChatAttachment = {
        id: createId("att"),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      };

      if (file.type.startsWith("image/") && file.size < 4 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          newAtt.dataUrl = reader.result as string;
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments((prev) => [...prev, newAtt]);
      }
    });

    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Submit chat message
  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputText).trim();
      const currentAtts = [...attachments];

      if (!text && currentAtts.length === 0) return;

      // Reset input fields
      setInputText("");
      setAttachments([]);
      setIsDrawerOpen(true);

      const userMsgId = createId("user");
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: text,
        attachments: currentAtts,
        createdAt: Date.now(),
        status: "done",
      };

      const assistantMsgId = createId("asst");
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        toolCalls: [],
        createdAt: Date.now(),
        status: "streaming",
      };

      const updatedHistory = [...messages, userMessage];
      setMessages([...updatedHistory, assistantMessage]);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const mode = await streamChat({
          messages: updatedHistory,
          context: {
            page: contextPage,
            user_role: userRole,
            timestamp: new Date().toISOString(),
          },
          signal: abortController.signal,
          onEvent: (event) => {
            if (event.type === "token") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: msg.content + event.content }
                    : msg
                )
              );
            } else if (event.type === "tool_call") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  const tools = msg.toolCalls ? [...msg.toolCalls] : [];
                  const existsIdx = tools.findIndex((t) => t.id === event.id);
                  const newTool: ToolCallInfo = {
                    id: event.id,
                    name: event.name,
                    args: event.args,
                    status: event.status || "running",
                  };
                  if (existsIdx >= 0) {
                    tools[existsIdx] = newTool;
                  } else {
                    tools.push(newTool);
                  }
                  return { ...msg, toolCalls: tools };
                })
              );
            } else if (event.type === "tool_result") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  const tools = (msg.toolCalls || []).map((t) =>
                    t.id === event.id
                      ? { ...t, status: event.status, summary: event.summary }
                      : t
                  );
                  return { ...msg, toolCalls: tools };
                })
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        status: "error",
                        content:
                          msg.content +
                          `\n\n> ⚠️ **Error:** ${event.message}`,
                      }
                    : msg
                )
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, status: "done" } : msg
                )
              );
            }
          },
        });

        setChatMode(mode);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    status: "error",
                    content:
                      msg.content ||
                      `⚠️ Terjadi kendala komunikasi: ${err?.message || "Gagal menghubungi server"}`,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [inputText, attachments, messages, contextPage, userRole]
  );

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleResetChat = () => {
    handleStopStream();
    setMessages([]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Keyboard handler in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format role label
  const roleDisplay =
    userRole === "admin"
      ? "Admin (Full Access)"
      : userRole === "manager"
      ? "Manager (Analytics)"
      : userRole === "sales_rep" || userRole === "sales"
      ? "Sales Rep (RLS Active)"
      : userRole === "warehouse_staff" || userRole === "warehouse"
      ? "Warehouse (Gudang Binaan)"
      : "Viewer";

  // Helper to render the exact .container-ia-chat requested by user
  const renderChatBoxElement = () => (
    <div className={`container-ia-chat ${inputText.trim() ? "has-value" : ""}`}>
      <input
        type="checkbox"
        name="input-voice"
        id="input-voice"
        className="input-voice"
        style={{ display: "none" }}
        checked={isVoiceActive}
        onChange={handleVoiceToggle}
      />
      <input
        type="text"
        name="input-text"
        id="input-text"
        placeholder="Ask Anything..."
        className="input-text"
        required
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        title="Tanyakan apa saja seputar data stok, sales, piutang, CRM, atau MCP..."
      />
      <input
        type="checkbox"
        name="input-files"
        id="input-files"
        className="input-files"
        style={{ display: "none" }}
      />

      {/* ── Upload icons (Camera, Image, Folder) ── */}
      <div className="container-upload-files">
        <svg
          className="upload-file"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          onClick={() => triggerFileSelect("camera")}
        >
          <title>Ambil foto / kamera</title>
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="13" r="3"></circle>
            <path d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21Z"></path>
          </g>
        </svg>
        <svg
          className="upload-file"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          onClick={() => triggerFileSelect("image")}
        >
          <title>Unggah gambar / foto</title>
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <circle cx="9" cy="9" r="2"></circle>
            <path d="m21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
          </g>
        </svg>
        <svg
          className="upload-file"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          onClick={() => triggerFileSelect("doc")}
        >
          <title>Unggah dokumen / laporan</title>
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
          ></path>
        </svg>
      </div>

      {/* ── Plus button when focused/valid ── */}
      <label
        htmlFor="input-files"
        className="label-files"
        onClick={(e) => {
          e.preventDefault();
          triggerFileSelect("all");
        }}
        title="Tambah lampiran file"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 12h14m-7-7v14"
          ></path>
        </svg>
      </label>

      {/* ── Voice button + Expanding AI Orb ── */}
      <label htmlFor="input-voice" className="label-voice">
        <svg
          className="icon-voice"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
            d="M12 4v16m4-13v10M8 7v10m12-6v2M4 11v2"
          ></path>
        </svg>
        <div className="ai">
          <div className="container">
            <div className="c c4"></div>
            <div className="c c1"></div>
            <div className="c c2"></div>
            <div className="c c3"></div>
            <div className="rings"></div>
          </div>
          <div className="glass"></div>
        </div>
        <div className="text-voice">
          <p>{speechTranscript || "Conversation Started"}</p>
          <p>Press to cancel the conversation</p>
        </div>
      </label>

      {/* ── Submit button (Arrow Up) ── */}
      <label
        htmlFor="input-text"
        className="label-text"
        onClick={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        title="Kirim pertanyaan ke AI LLM"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m5 12l7-7l7 7m-7 7V5"
          ></path>
        </svg>
      </label>
    </div>
  );

  // Helper to render attachment badges
  const renderAttachmentsPreview = () => {
    if (attachments.length === 0) return null;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          flexWrap: "wrap",
          marginBottom: "0.35rem",
        }}
      >
        {attachments.map((att) => (
          <div
            key={att.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.2rem 0.5rem",
              borderRadius: "6px",
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              fontSize: "0.72rem",
              color: "var(--text-primary)",
            }}
          >
            <Paperclip size={12} style={{ color: "#0D99FF" }} />
            <span
              style={{
                maxWidth: "110px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {att.name}
            </span>
            <button
              type="button"
              onClick={() => removeAttachment(att.id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 0,
                display: "flex",
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* ── Hidden File Input for Real Uploads ── */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* ── Floating / Inline Chat Box Container ── */}
      {variant === "floating" ? (
        <div className="aic-floating-dock">
          {/* If minimized to floating button */}
          {isDockCollapsed && !isDrawerOpen ? (
            <button
              type="button"
              onClick={() => setIsDockCollapsed(false)}
              className="aic-floating-pill-trigger"
              title="Tanya CPA AI (Klik untuk membuka chatbox)"
            >
              <span
                style={{
                  background: "#ffffff",
                  borderRadius: "6px",
                  padding: "2px 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              >
                <PadiAILogo size={14} />
              </span>
              <span>Tanya CPA AI</span>
              {messages.length > 0 && (
                <span className="pill-badge">{messages.length}</span>
              )}
            </button>
          ) : !isDrawerOpen ? (
            /* Full Floating Card with chatbox input */
            <div className="aic-floating-card">
              <div className="aic-floating-card-header">
                <div className="aic-floating-card-title">
                  <span
                    style={{
                      background: "#ffffff",
                      borderRadius: "6px",
                      padding: "2px 5px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <PadiAILogo size={14} />
                  </span>
                  <span>Tanya CPA AI</span>
                </div>
                <div className="aic-floating-card-actions">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(true)}
                      className="aic-floating-badge-btn"
                      title="Buka riwayat percakapan"
                    >
                      <MessageSquare size={12} />
                      <span>Percakapan ({messages.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDockCollapsed(true)}
                    className="aic-floating-btn-mini"
                    title="Perkecil ke tombol floating"
                    aria-label="Perkecil ke tombol floating"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              </div>

              {renderAttachmentsPreview()}
              {renderChatBoxElement()}
            </div>
          ) : null}
        </div>
      ) : (
        /* Inline Container for embedding */
        <div className={className}>
          {renderAttachmentsPreview()}
          {renderChatBoxElement()}
          {!isDrawerOpen && messages.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="aic-floating-trigger"
            >
              <span
                style={{
                  background: "#ffffff",
                  borderRadius: "6px",
                  padding: "2px 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PadiAILogo size={14} />
              </span>
              <span>Buka Percakapan AI ({messages.length})</span>
            </button>
          )}
        </div>
      )}

      {/* ── Expandable Conversation Drawer / Window ── */}
      {isDrawerOpen && (
        <>
          <div
            className="aic-drawer-overlay"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className={`aic-drawer ${isFullscreen ? "fullscreen" : ""}`}>
            {/* ── Drawer Header ── */}
            <div className="aic-drawer-header">
              <div className="aic-drawer-title">
                <div
                  style={{
                    width: 38,
                    height: 32,
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid rgba(13, 153, 255, 0.25)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px 4px",
                    flexShrink: 0,
                  }}
                >
                  <PadiAILogo size={20} />
                </div>
                <div>
                  <h3>
                    CPA AI Assistant
                    <span
                      className={`aic-badge ${
                        chatMode === "live" ? "aic-badge-live" : "aic-badge-demo"
                      }`}
                    >
                      {chatMode === "live" ? "Live API" : "MCP Ready (Demo)"}
                    </span>
                    <span className="aic-badge aic-badge-mcp">
                      MCP RBAC
                    </span>
                  </h3>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <ShieldCheck size={12} style={{ color: "#10B981" }} />
                    <span>Role: {roleDisplay}</span>
                  </div>
                </div>
              </div>

              <div className="aic-header-actions">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="aic-btn-icon"
                    title="Mulai percakapan baru"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="aic-btn-icon"
                  title={isFullscreen ? "Perkecil ukuran" : "Perbesar layar"}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="aic-btn-icon"
                  title="Tutup jendela chat"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* ── Message History List ── */}
            <div className="aic-messages-container">
              {messages.length === 0 ? (
                <div className="aic-welcome">
                  <div
                    style={{
                      width: 90,
                      height: 48,
                      margin: "0 auto 0.75rem auto",
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "5px 10px",
                      boxShadow: "0 4px 16px rgba(13, 153, 255, 0.15)",
                      border: "1px solid rgba(13, 153, 255, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PadiAILogo size={34} />
                  </div>
                  <h4>Asisten AI &amp; Integrasi MCP</h4>
                  <p>
                    Tanyakan informasi bisnis Anda. AI akan mengeksekusi tool MCP
                    resmi dengan pengamanan <strong>RBAC &amp; Row-Level Security</strong> otomatis.
                  </p>

                  <div className="aic-prompt-chips">
                    {SUGGESTED_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.query)}
                        className="aic-prompt-chip"
                      >
                        <Sparkles size={12} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`aic-message-row ${msg.role}`}>
                    <div className={`aic-avatar ${msg.role}`}>
                      {msg.role === "assistant" ? <PadiAILogo size={18} /> : "Anda"}
                    </div>

                    <div
                      className={`aic-bubble ${msg.role} ${
                        msg.status === "error" ? "error" : ""
                      }`}
                    >
                      {/* Attachments if any */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.4rem",
                            flexWrap: "wrap",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                background: "rgba(0, 0, 0, 0.2)",
                                fontSize: "0.7rem",
                              }}
                            >
                              <Paperclip size={10} />
                              <span>{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tool Call Badges */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="aic-tools-list">
                          {msg.toolCalls.map((t) => (
                            <div
                              key={t.id}
                              className={`aic-tool-pill ${t.status}`}
                            >
                              {t.status === "running" ? (
                                <LoaderCircle size={12} className="animate-spin" />
                              ) : t.status === "done" ? (
                                <CircleCheck size={12} />
                              ) : (
                                <CircleAlert size={12} />
                              )}
                              <span>
                                MCP Tool: <strong>{t.name}</strong>
                              </span>
                              {t.summary && (
                                <span style={{ opacity: 0.85 }}>({t.summary})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Content */}
                      {msg.role === "assistant" ? (
                        <>
                          <ChatMarkdown content={msg.content} />
                          {msg.status === "streaming" && (
                            <span
                              style={{
                                display: "inline-block",
                                width: 8,
                                height: 14,
                                marginLeft: 4,
                                background: "#0D99FF",
                                animation: "pulse 1s infinite",
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <div>{msg.content}</div>
                      )}

                      {/* Assistant footer actions */}
                      {msg.role === "assistant" && msg.content && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "0.4rem",
                            marginTop: "0.4rem",
                            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                            paddingTop: "0.3rem",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            title="Salin jawaban"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} style={{ color: "#10B981" }} />
                                <span style={{ color: "#10B981" }}>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Stop Generating Button ── */}
            {isStreaming && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "0.4rem",
                  background: "rgba(0, 0, 0, 0.2)",
                }}
              >
                <button
                  type="button"
                  onClick={handleStopStream}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    borderRadius: "6px",
                    padding: "0.3rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                >
                  <Square size={12} />
                  <span>Hentikan Jawaban</span>
                </button>
              </div>
            )}

            {/* ── Drawer Footer with Quick Input ── */}
            <div className="aic-drawer-footer">
              <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                {/* Secondary input inside drawer so user can continue chatting easily */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "50px",
                    padding: "0.35rem 0.5rem 0.35rem 1rem",
                  }}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tulis pertanyaan lanjutan..."
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => triggerFileSelect("all")}
                    className="aic-btn-icon"
                    title="Tambah lampiran"
                    style={{ borderRadius: "50%" }}
                  >
                    <Paperclip size={15} />
                  </button>
                  <button
                    type="submit"
                    disabled={!inputText.trim() && attachments.length === 0}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background:
                        inputText.trim() || attachments.length > 0
                          ? "linear-gradient(135deg, #0D99FF, #9147ff)"
                          : "var(--bg-hover)",
                      border: "none",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        inputText.trim() || attachments.length > 0
                          ? "pointer"
                          : "not-allowed",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m5 12l7-7l7 7m-7 7V5"
                      ></path>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

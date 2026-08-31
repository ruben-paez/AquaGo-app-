"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sessionHeaders, getStoredToken } from "@/lib/session-client";
import { timeShort } from "@/lib/format";

interface ChatMsg {
  id: number;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
}

const ROL_LABEL: Record<string, string> = {
  cliente: "Cliente",
  repartidor: "Vendedor",
  marca: "La marca",
  plataforma: "Plataforma",
};

/**
 * Chat del pedido: cliente ↔ vendedor asignado (y staff si hace falta).
 * Se actualiza solo cada 6 segundos. mine = burbuja a la derecha.
 */
export default function ChatBox({
  orderId,
  token,
  compact = false,
}: {
  orderId: number;
  token?: string | null;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMsg[] | null>(null);
  const [myRole, setMyRole] = useState<string>("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement | null>(null);
  const lastCount = useRef(0);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scroller.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const base = sessionHeaders();
      const headers = token ? { ...base, "x-aquago-session": token } : base;
      const res = await fetch(`/api/orders/${orderId}/messages`, { headers, cache: "no-store" });
      if (!res.ok) {
        setError("El chat no está disponible.");
        return;
      }
      const d = await res.json();
      setMyRole(d.chatRole);
      setMessages(d.messages ?? []);
      if ((d.messages ?? []).length !== lastCount.current) {
        lastCount.current = (d.messages ?? []).length;
        scrollDown();
      }
    } catch {
      // sin conexión: se mantiene la última vista
    }
  }, [orderId, token, scrollDown]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const base = sessionHeaders({ "Content-Type": "application/json" });
      const headers = token ? { ...base, "x-aquago-session": token } : base;
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body }),
      });
      const d = await res.json();
      if (res.ok) {
        setText("");
        setMessages((prev) => [...(prev ?? []), d.message]);
        scrollDown();
      } else {
        setError(d.error ?? "No se pudo enviar.");
      }
    } catch {
      setError("Sin conexión.");
    } finally {
      setSending(false);
    }
  }

  if (error && messages === null) {
    return <p className="text-xs font-semibold text-danger">{error}</p>;
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white overflow-hidden">
      <div
        ref={scroller}
        className={`space-y-2 overflow-y-auto bg-paper px-3 ${compact ? "h-44 py-2" : "h-64 py-3"}`}
      >
        {messages === null && <p className="text-center text-xs text-ink-soft">Cargando conversación…</p>}
        {messages?.length === 0 && (
          <p className="mt-6 text-center text-xs text-ink-soft">
            Escribí el primer mensaje — ej: “el portón está pintado de azul”.
          </p>
        )}
        {messages?.map((m) => {
          const mine = m.senderRole === myRole;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-water-700 text-white"
                    : "rounded-bl-sm border border-ink/10 bg-white text-ink"
                }`}
              >
                {!mine && (
                  <p className="text-[10px] font-bold uppercase tracking-wide text-water-700">
                    {ROL_LABEL[m.senderRole] ?? m.senderRole} · {m.senderName}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-water-100" : "text-ink-soft"}`}>
                  {timeShort(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-ink/10 bg-white p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Escribí un mensaje…"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-water-500"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-lg bg-water-700 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-water-800 disabled:opacity-50"
        >
          {sending ? "…" : "Enviar"}
        </button>
      </div>
      {error && <p className="bg-white px-3 pb-2 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { addComment, getComments, deleteComment } from "@/app/(app)/comments/actions";
import type { Comment } from "@/types/database";

type Props = {
  entityType: "initiative" | "project";
  entityId: string;
  currentUserId: string;
  readOnly?: boolean;
};

export function CommentsThread({ entityType, entityId, currentUserId, readOnly = false }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getComments(entityType, entityId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [entityType, entityId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await addComment(entityType, entityId, body);
    if (result.error) {
      setError(result.error);
    } else {
      setBody("");
      const updated = await getComments(entityType, entityId);
      setComments(updated);
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await deleteComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Comment list */}
      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {loading && (
          <p className="text-xs text-gray-400 text-center py-3">Cargando…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3">Sin comentarios aún.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="group flex gap-2">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
              style={{ background: "#E8621A" }}
            >
              {initials(c.author?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-semibold text-brand-black">
                  {c.author?.full_name ?? "Usuario"}
                </span>
                <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                {c.author_id === currentUserId && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="ml-auto text-[10px] text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                    title="Eliminar"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="text-xs text-brand-gray leading-snug whitespace-pre-wrap break-words">{c.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t border-gray-100 pt-2 mt-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribí un comentario…"
            rows={2}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
          />
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="self-end px-4 py-1.5 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white transition"
          >
            {submitting ? "Enviando…" : "Comentar"}
          </button>
        </form>
      )}
    </div>
  );
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

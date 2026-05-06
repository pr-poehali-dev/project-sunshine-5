import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getBoardBySlug } from "@/lib/boards";
import BoardHeader from "@/components/BoardHeader";
import Icon from "@/components/ui/icon";
import { MESSAGES_URL, Message, timeAgo } from "@/lib/api";

export default function ThreadPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const board = getBoardBySlug(slug || "");

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [likingId, setLikingId] = useState<number | null>(null);

  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [replyError, setReplyError] = useState("");

  const op = messages.find((m) => m.parent_id === null);
  const replies = messages.filter((m) => m.parent_id !== null);

  async function fetchThread() {
    try {
      const res = await fetch(`${MESSAGES_URL}?thread_id=${id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchThread();
    const interval = setInterval(fetchThread, 20000);
    return () => clearInterval(interval);
  }, [id]);

  async function handleLike(msgId: number) {
    if (liked.has(msgId) || likingId === msgId) return;
    setLikingId(msgId);
    try {
      const res = await fetch(MESSAGES_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msgId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, likes: data.likes } : m));
        setLiked((prev) => new Set(prev).add(msgId));
      }
    } finally {
      setLikingId(null);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || reply.length < 5) return;
    setReplyStatus("loading");
    setReplyError("");
    try {
      const res = await fetch(MESSAGES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), category: slug, parent_id: Number(id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyError(data.error || "Ошибка");
        setReplyStatus("error");
        return;
      }
      setReply("");
      setReplyStatus("success");
      setTimeout(() => setReplyStatus("idle"), 2000);
      fetchThread();
    } catch {
      setReplyError("Ошибка соединения");
      setReplyStatus("error");
    }
  }

  if (!board) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <BoardHeader />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8 text-xs font-mono text-neutral-600">
          <Link to="/" className="hover:text-neutral-400 transition-colors">главная</Link>
          <span>/</span>
          <Link to={`/board/${slug}`} className="hover:text-neutral-400 transition-colors">{board.label}</Link>
          <span>/</span>
          <span className="text-neutral-500">#{id}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-neutral-700">
            <Icon name="Loader2" size={20} className="animate-spin" />
          </div>
        ) : !op ? (
          <div className="text-center py-20 text-neutral-600 font-mono text-sm">
            <p>Тред не найден</p>
            <Link to={`/board/${slug}`} className="text-neutral-500 hover:text-white mt-2 inline-block">← назад</Link>
          </div>
        ) : (
          <>
            {/* OP post */}
            <div className="bg-neutral-900 border border-neutral-700 p-5 mb-6">
              <div className="flex items-center gap-3 mb-3 text-xs font-mono text-neutral-500">
                <span className="text-green-500 font-bold">OP</span>
                <span>·</span>
                <span>Аноним</span>
                <span>·</span>
                <span>#{op.id}</span>
                <span>·</span>
                <span>{timeAgo(op.created_at)}</span>
              </div>
              <p className="text-neutral-100 leading-relaxed whitespace-pre-wrap text-sm mb-4">{op.content}</p>
              <button
                onClick={() => handleLike(op.id)}
                disabled={liked.has(op.id) || likingId === op.id}
                className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${liked.has(op.id) ? "text-red-500 cursor-default" : "text-neutral-600 hover:text-red-500"}`}
              >
                <motion.span animate={liked.has(op.id) ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.25 }}>
                  <Icon name="Heart" size={12} className={liked.has(op.id) ? "fill-red-500" : ""} />
                </motion.span>
                {op.likes > 0 ? op.likes : "лайк"}
              </button>
            </div>

            {/* Reply form */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 mb-6">
              <p className="text-neutral-600 text-xs font-mono mb-3 uppercase tracking-widest">Ответить в тред</p>
              <form onSubmit={handleReply}>
                <div className="relative mb-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Твой ответ..."
                    maxLength={2000}
                    rows={4}
                    className="w-full resize-none bg-neutral-950 border border-neutral-800 p-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors text-sm font-mono"
                  />
                  <span className={`absolute bottom-3 right-3 text-xs font-mono ${2000 - reply.length < 100 ? "text-red-500" : "text-neutral-700"}`}>
                    {2000 - reply.length}
                  </span>
                </div>
                {replyStatus === "error" && <p className="text-red-500 text-xs mb-2 font-mono">{replyError}</p>}
                {replyStatus === "success" && <p className="text-green-500 text-xs mb-2 font-mono">Ответ отправлен</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={replyStatus === "loading" || reply.trim().length < 5}
                    className="bg-white text-neutral-900 px-5 py-1.5 text-xs font-mono uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-30 flex items-center gap-2"
                  >
                    {replyStatus === "loading" && <Icon name="Loader2" size={11} className="animate-spin" />}
                    Отправить
                  </button>
                </div>
              </form>
            </div>

            {/* Replies */}
            {replies.length > 0 && (
              <div className="border-l-2 border-neutral-800 pl-4 flex flex-col gap-3">
                <p className="text-neutral-600 text-xs font-mono mb-1">{replies.length} {replies.length === 1 ? "ответ" : "ответа"}</p>
                {replies.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors p-4"
                  >
                    <div className="flex items-center gap-3 mb-2 text-xs font-mono text-neutral-600">
                      <span>Аноним</span>
                      <span>·</span>
                      <span>#{msg.id}</span>
                      <span>·</span>
                      <span>{timeAgo(msg.created_at)}</span>
                    </div>
                    <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap text-sm mb-3">{msg.content}</p>
                    <button
                      onClick={() => handleLike(msg.id)}
                      disabled={liked.has(msg.id) || likingId === msg.id}
                      className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${liked.has(msg.id) ? "text-red-500 cursor-default" : "text-neutral-600 hover:text-red-500"}`}
                    >
                      <Icon name="Heart" size={11} className={liked.has(msg.id) ? "fill-red-500" : ""} />
                      {msg.likes > 0 ? msg.likes : "лайк"}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

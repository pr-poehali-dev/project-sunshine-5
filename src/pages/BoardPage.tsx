import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getBoardBySlug, BOARDS } from "@/lib/boards";
import BoardHeader from "@/components/BoardHeader";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/3d44cc6a-f7a3-46d2-9dc5-29271796b26a";

interface Message {
  id: number;
  content: string;
  category: string;
  created_at: string;
  likes: number;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

type PostStatus = "idle" | "loading" | "success" | "error";

export default function BoardPage() {
  const { slug } = useParams<{ slug: string }>();
  const board = getBoardBySlug(slug || "");

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [likingId, setLikingId] = useState<number | null>(null);

  const [content, setContent] = useState("");
  const [postStatus, setPostStatus] = useState<PostStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const remaining = 2000 - content.length;

  async function fetchMessages() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      const all: Message[] = data.messages || [];
      setMessages(all.filter((m) => m.category === slug));
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    setLoadingMsgs(true);
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  async function handleLike(id: number) {
    if (liked.has(id) || likingId === id) return;
    setLikingId(id);
    try {
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, likes: data.likes } : m));
        setLiked((prev) => new Set(prev).add(id));
      }
    } finally {
      setLikingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || content.length < 5) return;
    setPostStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), category: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Что-то пошло не так");
        setPostStatus("error");
        return;
      }
      setContent("");
      setPostStatus("success");
      setTimeout(() => setPostStatus("idle"), 3000);
      fetchMessages();
    } catch {
      setErrorMsg("Ошибка соединения");
      setPostStatus("error");
    }
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-neutral-500 font-mono">404 — доска не найдена</p>
        <Link to="/" className="text-neutral-400 hover:text-white text-sm">← на главную</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <BoardHeader />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Board title */}
        <div className="mb-8 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-2xl font-bold text-white">{board.label}</span>
            <span className="text-neutral-500 text-lg">—</span>
            <span className="text-neutral-300 text-lg">{board.description}</span>
          </div>
          <p className="text-neutral-600 text-sm font-mono">анонимно · без регистрации · без следов</p>
        </div>

        {/* Post form */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 mb-8">
          <p className="text-neutral-500 text-xs font-mono mb-3 uppercase tracking-widest">Новый пост</p>
          <AnimatePresence mode="wait">
            {postStatus === "success" ? (
              <motion.div
                key="ok"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-400 text-sm py-4"
              >
                <Icon name="Check" size={16} />
                Пост отправлен анонимно
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}>
                <div className="relative mb-3">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={board.placeholder}
                    maxLength={2000}
                    rows={5}
                    className="w-full resize-none bg-neutral-950 border border-neutral-800 p-4 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors text-sm font-mono"
                  />
                  <span className={`absolute bottom-3 right-3 text-xs font-mono ${remaining < 100 ? "text-red-500" : "text-neutral-700"}`}>
                    {remaining}
                  </span>
                </div>
                {postStatus === "error" && (
                  <p className="text-red-500 text-xs mb-3 font-mono">{errorMsg}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-700 text-xs font-mono flex items-center gap-1.5">
                    <Icon name="ShieldCheck" size={12} />
                    аноним
                  </span>
                  <button
                    type="submit"
                    disabled={postStatus === "loading" || content.trim().length < 5}
                    className="bg-white text-neutral-900 px-6 py-2 text-xs font-mono uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {postStatus === "loading" ? <Icon name="Loader2" size={12} className="animate-spin" /> : null}
                    Отправить
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Messages */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-neutral-600 text-xs font-mono">{messages.length} постов</p>
          <button onClick={fetchMessages} className="text-neutral-600 hover:text-neutral-400 text-xs font-mono flex items-center gap-1 transition-colors">
            <Icon name="RefreshCw" size={11} />
            обновить
          </button>
        </div>

        {loadingMsgs ? (
          <div className="flex justify-center py-16 text-neutral-700">
            <Icon name="Loader2" size={20} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-neutral-700 font-mono text-sm">
            <p>Постов пока нет.</p>
            <p className="mt-1">Будь первым на этой доске.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors p-5"
              >
                <div className="flex items-center gap-3 mb-3 text-xs font-mono text-neutral-600">
                  <span className="text-neutral-500">Аноним</span>
                  <span>·</span>
                  <span>#{msg.id}</span>
                  <span>·</span>
                  <span>{timeAgo(msg.created_at)}</span>
                </div>
                <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap text-sm mb-4">{msg.content}</p>
                <button
                  onClick={() => handleLike(msg.id)}
                  disabled={liked.has(msg.id) || likingId === msg.id}
                  className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${
                    liked.has(msg.id) ? "text-red-500 cursor-default" : "text-neutral-700 hover:text-red-500"
                  }`}
                >
                  <motion.span animate={liked.has(msg.id) ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.25 }}>
                    <Icon name="Heart" size={12} className={liked.has(msg.id) ? "fill-red-500" : ""} />
                  </motion.span>
                  {msg.likes > 0 ? msg.likes : "лайк"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

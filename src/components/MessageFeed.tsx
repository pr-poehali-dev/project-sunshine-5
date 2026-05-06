import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/3d44cc6a-f7a3-46d2-9dc5-29271796b26a";

const CATEGORY_LABELS: Record<string, string> = {
  general: "Общее",
  problem: "Проблема",
  opinion: "Мнение",
  confession: "Признание",
  advice: "Совет",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-neutral-100 text-neutral-600",
  problem: "bg-red-50 text-red-600",
  opinion: "bg-blue-50 text-blue-600",
  confession: "bg-purple-50 text-purple-600",
  advice: "bg-green-50 text-green-600",
};

interface Message {
  id: number;
  content: string;
  category: string;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export default function MessageFeed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function fetchMessages() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setMessages(data.messages || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? messages : messages.filter((m) => m.category === filter);

  return (
    <section id="feed" className="bg-neutral-50 py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="uppercase text-sm tracking-wide text-neutral-400 mb-4">Лента</p>
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 leading-tight">
            Голоса<br />без имён
          </h2>
          <button
            onClick={fetchMessages}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-900 transition-colors duration-200"
          >
            <Icon name="RefreshCw" size={14} />
            Обновить
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {[{ value: "all", label: "Все" }, ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))].map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-4 py-1.5 text-sm border transition-all duration-200 ${
                filter === cat.value
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400">
            <Icon name="Loader2" size={24} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <Icon name="MessageSquare" size={40} className="mx-auto mb-4 opacity-30" />
            <p>Пока нет сообщений. Будь первым!</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-4">
              {filtered.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white border border-neutral-100 p-6 hover:border-neutral-300 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2.5 py-1 font-medium ${CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.general}`}>
                      {CATEGORY_LABELS[msg.category] || "Общее"}
                    </span>
                    <span className="text-xs text-neutral-400">{timeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

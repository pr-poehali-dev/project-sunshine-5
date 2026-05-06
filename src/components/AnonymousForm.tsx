import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/3d44cc6a-f7a3-46d2-9dc5-29271796b26a";

const CATEGORIES = [
  { value: "general", label: "Общее" },
  { value: "problem", label: "Проблема" },
  { value: "opinion", label: "Мнение" },
  { value: "confession", label: "Признание" },
  { value: "advice", label: "Совет" },
];

type Status = "idle" | "loading" | "success" | "error";

export default function AnonymousForm() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const remaining = 2000 - content.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || content.length < 5) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Что-то пошло не так");
        setStatus("error");
        return;
      }
      setStatus("success");
      setContent("");
      setCategory("general");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setErrorMsg("Ошибка соединения. Попробуй ещё раз.");
      setStatus("error");
    }
  }

  return (
    <section id="share" className="bg-white py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="uppercase text-sm tracking-wide text-neutral-400 mb-4">Поделиться анонимно</p>
        <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 leading-tight mb-12">
          Скажи то, что<br />давно хотел сказать
        </h2>

        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-6">
                <Icon name="Check" size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Отправлено</h3>
              <p className="text-neutral-500">Твоё сообщение принято. Имя не сохранялось.</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
            >
              <div className="flex flex-wrap gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-4 py-1.5 text-sm border transition-all duration-200 ${
                      category === cat.value
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative mb-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Напиши здесь всё что угодно. Никто не узнает, кто ты..."
                  maxLength={2000}
                  rows={7}
                  className="w-full resize-none border border-neutral-200 p-5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors duration-200 text-base"
                />
                <span className={`absolute bottom-4 right-4 text-xs ${remaining < 100 ? "text-red-400" : "text-neutral-300"}`}>
                  {remaining}
                </span>
              </div>

              {status === "error" && (
                <p className="text-red-500 text-sm mb-4 flex items-center gap-2">
                  <Icon name="AlertCircle" size={14} />
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <Icon name="ShieldCheck" size={14} />
                  Анонимно — никаких данных не сохраняется
                </p>
                <button
                  type="submit"
                  disabled={status === "loading" || content.trim().length < 5}
                  className="bg-neutral-900 text-white px-8 py-3 text-sm uppercase tracking-wide hover:bg-neutral-700 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {status === "loading" ? (
                    <>
                      <Icon name="Loader2" size={14} className="animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить"
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

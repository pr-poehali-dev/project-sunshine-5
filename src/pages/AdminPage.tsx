import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";
import { MOD_URL, Message, timeAgo, getModToken, setModToken, clearModToken } from "@/lib/api";
import { BOARDS } from "@/lib/boards";

const CATEGORY_LABELS: Record<string, string> = {
  general: "/gen/",
  problem: "/prob/",
  opinion: "/opin/",
  confession: "/conf/",
  advice: "/adv/",
};

function modFetch(action: string, method: string, body?: object, extra?: Record<string, string>) {
  const token = getModToken();
  const url = action.startsWith("GET") || method === "GET"
    ? `${MOD_URL}?action=${action}${extra ? "&" + new URLSearchParams(extra).toString() : ""}`
    : MOD_URL;
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "X-Mod-Token": token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");

  const [needRegister, setNeedRegister] = useState(false);
  const [regForm, setRegForm] = useState({ username: "", password: "" });
  const [regError, setRegError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = getModToken();
    if (!token) {
      setAuthed(false);
      checkNeedRegister();
      return;
    }
    const res = await fetch(`${MOD_URL}?action=me`, {
      headers: { "X-Mod-Token": token },
    });
    if (res.ok) {
      const data = await res.json();
      setUsername(data.username);
      setAuthed(true);
      loadMessages();
    } else {
      clearModToken();
      setAuthed(false);
      checkNeedRegister();
    }
  }

  async function checkNeedRegister() {
    const res = await fetch(MOD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", username: "", password: "" }),
    });
    const data = await res.json();
    setNeedRegister(res.status !== 403);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const res = await fetch(MOD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username: loginForm.username, password: loginForm.password }),
    });
    const data = await res.json();
    setLoginLoading(false);
    if (!res.ok) {
      setLoginError(data.error || "Ошибка");
      return;
    }
    setModToken(data.token);
    setUsername(data.username);
    setAuthed(true);
    loadMessages();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    const res = await fetch(MOD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", username: regForm.username, password: regForm.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRegError(data.error || "Ошибка");
      return;
    }
    setModToken(data.token);
    setUsername(data.username);
    setAuthed(true);
    loadMessages();
  }

  async function loadMessages() {
    setLoadingMsgs(true);
    const params: Record<string, string> = { show_hidden: "true" };
    const res = await fetch(
      `${MOD_URL}?action=posts&show_hidden=true`,
      { headers: { "X-Mod-Token": getModToken() } }
    );
    const data = await res.json();
    setMessages(data.messages || []);
    setLoadingMsgs(false);
  }

  async function toggleHide(msg: Message) {
    const res = await fetch(MOD_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Mod-Token": getModToken() },
      body: JSON.stringify({ action: "hide", id: msg.id, hidden: !msg.is_hidden }),
    });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_hidden: !msg.is_hidden } : m));
    }
  }

  function handleLogout() {
    clearModToken();
    setAuthed(false);
    setMessages([]);
    checkNeedRegister();
  }

  const filtered = messages.filter((m) => {
    if (catFilter !== "all" && m.category !== catFilter) return false;
    if (!showHidden && m.is_hidden) return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (authed === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Icon name="Loader2" size={24} className="animate-spin text-neutral-600" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link to="/" className="text-neutral-600 hover:text-neutral-400 text-xs font-mono flex items-center gap-1 mb-6">
              <Icon name="ArrowLeft" size={11} /> на главную
            </Link>
            <p className="font-mono text-neutral-500 text-xs uppercase tracking-widest mb-2">ШЁПОТ</p>
            <h1 className="text-2xl font-bold text-white">{needRegister ? "Создать аккаунт модератора" : "Вход для модератора"}</h1>
          </div>

          {needRegister ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Логин"
                value={regForm.username}
                onChange={(e) => setRegForm((f) => ({ ...f, username: e.target.value }))}
                className="bg-neutral-900 border border-neutral-800 p-3 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-600 w-full"
              />
              <input
                type="password"
                placeholder="Пароль (мин. 6 символов)"
                value={regForm.password}
                onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                className="bg-neutral-900 border border-neutral-800 p-3 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-600 w-full"
              />
              {regError && <p className="text-red-500 text-xs font-mono">{regError}</p>}
              <button type="submit" className="bg-white text-neutral-900 py-3 text-sm font-mono uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-2">
                Создать
              </button>
              <p className="text-neutral-700 text-xs font-mono text-center">Первый и единственный аккаунт. Регистрация закроется после создания.</p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Логин"
                value={loginForm.username}
                onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                className="bg-neutral-900 border border-neutral-800 p-3 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-600 w-full"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                className="bg-neutral-900 border border-neutral-800 p-3 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-600 w-full"
              />
              {loginError && <p className="text-red-500 text-xs font-mono">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="bg-white text-neutral-900 py-3 text-sm font-mono uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-2 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loginLoading && <Icon name="Loader2" size={13} className="animate-spin" />}
                Войти
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-neutral-500 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors">
              <Icon name="ArrowLeft" size={11} /> главная
            </Link>
            <span className="text-neutral-700">|</span>
            <span className="text-white text-sm font-mono font-bold">Панель модератора</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-600 text-xs font-mono">{username}</span>
            <button onClick={handleLogout} className="text-neutral-600 hover:text-red-400 text-xs font-mono transition-colors flex items-center gap-1">
              <Icon name="LogOut" size={11} /> выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Всего постов", value: messages.length },
            { label: "Скрыто", value: messages.filter((m) => m.is_hidden).length },
            { label: "Активных", value: messages.filter((m) => !m.is_hidden).length },
          ].map((s) => (
            <div key={s.label} className="bg-neutral-900 border border-neutral-800 p-4">
              <p className="text-3xl font-bold text-white font-mono">{s.value}</p>
              <p className="text-neutral-600 text-xs font-mono mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <input
            type="text"
            placeholder="Поиск по тексту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-neutral-200 placeholder:text-neutral-700 font-mono text-xs focus:outline-none focus:border-neutral-600 w-56"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCatFilter("all")}
              className={`px-3 py-1 text-xs font-mono border transition-colors ${catFilter === "all" ? "bg-white text-neutral-900 border-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600"}`}
            >
              Все
            </button>
            {BOARDS.map((b) => (
              <button
                key={b.slug}
                onClick={() => setCatFilter(b.slug)}
                className={`px-3 py-1 text-xs font-mono border transition-colors ${catFilter === b.slug ? "bg-white text-neutral-900 border-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600"}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-mono text-neutral-500 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="accent-white"
            />
            Показывать скрытые
          </label>
          <button onClick={loadMessages} className="text-neutral-600 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors">
            <Icon name="RefreshCw" size={11} /> обновить
          </button>
        </div>

        <p className="text-neutral-700 text-xs font-mono mb-4">{filtered.length} постов</p>

        {loadingMsgs ? (
          <div className="flex justify-center py-20 text-neutral-700">
            <Icon name="Loader2" size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                className={`border p-4 transition-all ${msg.is_hidden ? "bg-neutral-950 border-neutral-800 opacity-50" : "bg-neutral-900 border-neutral-800"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 text-xs font-mono text-neutral-600 flex-wrap">
                      <span className="text-neutral-400">{CATEGORY_LABELS[msg.category] || msg.category}</span>
                      <span>·</span>
                      <span>#{msg.id}</span>
                      {msg.parent_id && <span className="text-yellow-700">↳ ответ #{msg.parent_id}</span>}
                      <span>·</span>
                      <span>{timeAgo(msg.created_at)}</span>
                      {msg.likes > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-red-700 flex items-center gap-0.5"><Icon name="Heart" size={10} className="fill-red-700" />{msg.likes}</span>
                        </>
                      )}
                      {msg.is_hidden && <span className="text-orange-600 font-bold">СКРЫТ</span>}
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/board/${msg.category}/thread/${msg.parent_id || msg.id}`}
                      className="text-neutral-700 hover:text-neutral-400 text-xs font-mono transition-colors flex items-center gap-1"
                    >
                      <Icon name="ExternalLink" size={11} />
                    </Link>
                    <button
                      onClick={() => toggleHide(msg)}
                      className={`flex items-center gap-1 text-xs font-mono px-3 py-1 border transition-colors ${
                        msg.is_hidden
                          ? "border-green-800 text-green-600 hover:bg-green-900"
                          : "border-red-900 text-red-600 hover:bg-red-950"
                      }`}
                    >
                      <Icon name={msg.is_hidden ? "Eye" : "EyeOff"} size={11} />
                      {msg.is_hidden ? "показать" : "скрыть"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const MESSAGES_URL = "https://functions.poehali.dev/3d44cc6a-f7a3-46d2-9dc5-29271796b26a";
export const MOD_URL = "https://functions.poehali.dev/95a34c0d-9ab8-4697-a864-b4c2278e7a2e";

export interface Message {
  id: number;
  content: string;
  category: string;
  created_at: string;
  likes: number;
  parent_id: number | null;
  reply_count?: number;
  is_hidden?: boolean;
}

export function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export function getModToken(): string {
  return localStorage.getItem("mod_token") || "";
}

export function setModToken(token: string) {
  localStorage.setItem("mod_token", token);
}

export function clearModToken() {
  localStorage.removeItem("mod_token");
}

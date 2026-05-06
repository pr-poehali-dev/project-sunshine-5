export interface Board {
  slug: string;
  label: string;
  description: string;
  color: string;
  textColor: string;
  placeholder: string;
}

export const BOARDS: Board[] = [
  {
    slug: "confession",
    label: "/conf/",
    description: "Признания",
    color: "bg-purple-50",
    textColor: "text-purple-700",
    placeholder: "Признайся в том, о чём молчишь...",
  },
  {
    slug: "advice",
    label: "/adv/",
    description: "Советы",
    color: "bg-green-50",
    textColor: "text-green-700",
    placeholder: "Попроси совета или поделись мудростью...",
  },
  {
    slug: "problem",
    label: "/prob/",
    description: "Проблемы",
    color: "bg-red-50",
    textColor: "text-red-700",
    placeholder: "Опиши то, что тебя беспокоит...",
  },
  {
    slug: "opinion",
    label: "/opin/",
    description: "Мнения",
    color: "bg-blue-50",
    textColor: "text-blue-700",
    placeholder: "Выскажи своё мнение, не стесняйся...",
  },
  {
    slug: "general",
    label: "/gen/",
    description: "Общее",
    color: "bg-neutral-100",
    textColor: "text-neutral-700",
    placeholder: "Напиши что угодно...",
  },
];

export function getBoardBySlug(slug: string): Board | undefined {
  return BOARDS.find((b) => b.slug === slug);
}

import { Link, useParams } from "react-router-dom";
import { BOARDS } from "@/lib/boards";
import Icon from "@/components/ui/icon";

export default function BoardHeader() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <header className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-6 h-12 overflow-x-auto scrollbar-hide">
          <Link
            to="/"
            className="text-white font-bold text-sm tracking-widest shrink-0 flex items-center gap-2 hover:text-neutral-300 transition-colors"
          >
            <Icon name="Ghost" size={16} />
            ШЁПОТ
          </Link>
          <span className="text-neutral-700 shrink-0">|</span>
          {BOARDS.map((board) => (
            <Link
              key={board.slug}
              to={`/board/${board.slug}`}
              className={`text-sm font-mono shrink-0 transition-colors duration-150 ${
                slug === board.slug
                  ? "text-white font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {board.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

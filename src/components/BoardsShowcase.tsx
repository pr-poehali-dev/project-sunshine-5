import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BOARDS } from "@/lib/boards";
import Icon from "@/components/ui/icon";

const BOARD_ICONS: Record<string, string> = {
  confession: "Heart",
  advice: "Lightbulb",
  problem: "CloudLightning",
  opinion: "MessageCircle",
  general: "Hash",
};

export default function BoardsShowcase() {
  return (
    <section id="boards" className="bg-neutral-950 py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="uppercase text-sm tracking-wide text-neutral-600 mb-4 font-mono">Доски</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
          Выбери свою<br />доску
        </h2>
        <p className="text-neutral-500 mb-14 max-w-md">
          Каждая доска — отдельное пространство. Пиши туда, где тебе нужно быть услышанным.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOARDS.map((board, i) => (
            <motion.div
              key={board.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Link
                to={`/board/${board.slug}`}
                className="group flex flex-col bg-neutral-900 border border-neutral-800 hover:border-neutral-600 p-6 transition-all duration-200 hover:bg-neutral-800"
              >
                <div className="flex items-start justify-between mb-6">
                  <span className="font-mono text-xl font-bold text-white">{board.label}</span>
                  <Icon
                    name={BOARD_ICONS[board.slug] || "Hash"}
                    size={18}
                    className="text-neutral-700 group-hover:text-neutral-400 transition-colors"
                  />
                </div>
                <p className="text-neutral-300 font-medium mb-1">{board.description}</p>
                <p className="text-neutral-600 text-sm leading-snug">{board.placeholder}</p>
                <div className="mt-6 flex items-center gap-1 text-xs text-neutral-700 group-hover:text-neutral-500 font-mono transition-colors">
                  перейти <Icon name="ArrowRight" size={11} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

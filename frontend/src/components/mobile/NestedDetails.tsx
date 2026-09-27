import { ChevronRight } from "lucide-react";
import type { DetailNode } from "../../types/stock";
import { useLanguage, type MessageKey } from "../../i18n";

interface NestedDetailsProps { nodes: DetailNode[]; depth?: number }

const toneClasses = { positive: "text-emerald-600", negative: "text-rose-600", neutral: "text-slate-600" };
const labelKeys: Record<string, MessageKey> = { pending: "technicalIndicators", momentum: "momentum", macd: "macdStatus", histogram: "histogram", averages: "movingAverages", ma: "averageSignal" };

export default function NestedDetails({ nodes, depth = 0 }: NestedDetailsProps) {
  const { t } = useLanguage();
  const labelFor = (node: DetailNode) => labelKeys[node.id] ? t(labelKeys[node.id]) : node.label;
  const valueFor = (value: string) => value === "站上" ? t("above") : value === "等待每日更新" ? t("pendingUpdate") : value;
  return (
    <div className={depth ? "ml-3 border-l border-slate-100 pl-3" : "space-y-1"}>
      {nodes.map((node) => "children" in node ? (
        <div key={node.id} className="py-1.5">
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500"><ChevronRight size={12} />{labelFor(node)}</div>
          <NestedDetails nodes={node.children} depth={depth + 1} />
        </div>
      ) : (
        <div key={node.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-0">
          <span className="text-[11px] text-slate-400">{labelFor(node)}</span>
          <strong className={`text-xs ${toneClasses[node.tone || "neutral"]}`}>{valueFor(node.value)}</strong>
        </div>
      ))}
    </div>
  );
}

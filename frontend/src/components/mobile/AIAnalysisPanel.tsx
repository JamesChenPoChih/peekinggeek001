import { useEffect, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

import { streamAnalysis, type AnalysisMode } from "../../api";
import type { StockPosition } from "../../types/stock";
import { useLanguage } from "../../i18n";

interface AIAnalysisPanelProps {
  stock: StockPosition;
  token: string;
}

export function AIAnalysisPanel({ stock, token }: AIAnalysisPanelProps) {
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<AnalysisMode>("quick");
  const [question, setQuestion] = useState(t("defaultQuestion"));
  const [answer, setAnswer] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setQuestion(t("defaultQuestion")); }, [language, t]);

  async function submitAnalysis() {
    if (!question.trim() || loading) return;

    setLoading(true);
    setAnswer("");
    setModel("");

    try {
      await streamAnalysis({
        token,
        stockId: stock.id,
        question: question.trim(),
        mode,
        onEvent: (event) => {
          if (event.type === "meta") setModel(event.model ?? "");
          if (event.type === "token") setAnswer((current) => current + event.content);
          if (event.type === "error") throw new Error(event.message ?? t("aiUnavailable"));
        },
      });
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : t("aiUnavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-t border-slate-200 px-5 py-5" aria-labelledby="ai-analysis-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-white">
            <Bot size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 id="ai-analysis-title" className="text-sm font-bold text-slate-950">{t("aiAnalysis")}</h2>
            <p className="text-xs text-slate-500">{stock.symbol} {t("technicalCopilot")}</p>
          </div>
        </div>
        <Sparkles size={18} className="text-emerald-500" aria-hidden="true" />
      </div>

      <div className="mb-3 grid grid-cols-2 rounded-md bg-slate-100 p-1" aria-label={t("analysisMode")}>
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`rounded px-3 py-2 text-xs font-semibold transition ${mode === "quick" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
        >
          {t("quickAnswer")} · Nano
        </button>
        <button
          type="button"
          onClick={() => setMode("deep")}
          className={`rounded px-3 py-2 text-xs font-semibold transition ${mode === "deep" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
        >
          {t("deepReport")} · Ultra
        </button>
      </div>

      {(answer || loading) && (
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {loading && !answer ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              {t("analyzing")}
            </span>
          ) : (
            <p className="whitespace-pre-wrap">{answer}</p>
          )}
          {model && <p className="mt-2 truncate text-[10px] text-slate-400">Model: {model}</p>}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={2}
          className="min-h-12 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          placeholder={t("askStock")}
          aria-label={t("aiAnalysis")}
        />
        <button
          type="button"
          onClick={submitAnalysis}
          disabled={loading || !question.trim()}
          className="grid size-12 shrink-0 place-items-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label={t("sendAnalysis")}
          title={t("sendAnalysis")}
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-400">{t("disclaimer")}</p>
    </section>
  );
}

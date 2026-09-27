import { ChevronDown, LoaderCircle, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { StockPosition } from "../../types/stock";
import { useLanguage } from "../../i18n";

interface StockCardProps {
  title: string;
  stock: StockPosition;
  stocks: StockPosition[];
  onSelect: (stock: StockPosition) => void;
  onRemove: (stock: StockPosition) => void;
  removing: boolean;
  removeError: string;
}

function formatPrice(stock: StockPosition): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: stock.market === "TW" ? 0 : 2,
    maximumFractionDigits: stock.market === "TW" ? 0 : 2,
  }).format(stock.currentPrice);
}

export default function StockCard({ title, stock, stocks, onSelect, onRemove, removing, removeError }: StockCardProps) {
  const { t } = useLanguage();
  const positive = stock.changePercent >= 0;
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-medium text-slate-400">{title}</p><h1 className="mt-1 text-lg font-bold text-slate-900">{stock.name}</h1><p className="text-[11px] text-slate-400">{stock.symbol} · {stock.market}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <label className="relative">
            <span className="sr-only">{t("selectStock")}</span>
            <select value={stock.id} onChange={(event) => onSelect(stocks.find((item) => item.id === Number(event.target.value)) || stock)} className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-[11px] font-semibold text-slate-600 outline-none focus:border-sky-500">
              {stocks.map((item) => <option key={item.id} value={item.id}>{item.symbol}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
          </label>
          <button
            type="button"
            onClick={() => onRemove(stock)}
            disabled={removing || stocks.length <= 1}
            title={stocks.length <= 1 ? t("keepOneStock") : `${t("removeStock")} ${stock.symbol}`}
            className="flex h-7 items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {removing ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {removing ? t("removingStock") : t("removeStock")}
          </button>
          {removeError && <span className="max-w-32 text-right text-[9px] leading-tight text-rose-600">{removeError}</span>}
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between">
        <div><span data-testid="stock-card-price" className="text-4xl font-semibold leading-none tracking-normal text-slate-950">{formatPrice(stock)}</span><span className="ml-1 text-xs text-slate-400">{stock.currency}</span></div>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
          {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{positive ? "+" : ""}{stock.changePercent.toFixed(2)}%
        </span>
      </div>
    </section>
  );
}

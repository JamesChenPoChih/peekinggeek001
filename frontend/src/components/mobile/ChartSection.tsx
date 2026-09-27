import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetchStockChart } from "../../api";
import { useLanguage } from "../../i18n";
import type { ChartRange, StockPosition, YahooChartResponse } from "../../types/stock";

interface ChartSectionProps { stock: StockPosition; token: string; liveQuote: YahooChartResponse | null }

const ranges: ChartRange[] = ["1D", "1W", "1M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"];

export default function ChartSection({ stock, token, liveQuote }: ChartSectionProps) {
  const { language, t } = useLanguage();
  const [range, setRange] = useState<ChartRange>("1D");
  const [chart, setChart] = useState<YahooChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (range === "1D") { setError(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setChart(null);
    fetchStockChart(token, stock.id, range, controller.signal)
      .then(setChart)
      .catch((chartError) => {
        if (!(chartError instanceof DOMException && chartError.name === "AbortError")) setError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, stock.id, token]);

  const activeChart = range === "1D" ? liveQuote : chart;
  const isLoading = range === "1D" ? !liveQuote : loading;

  const formatter = useMemo(() => new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : "en-US", {
    ...(range === "1D" ? { hour: "2-digit", minute: "2-digit" } : range === "1W" ? { weekday: "short", hour: "2-digit" } : ["3Y", "5Y", "ALL"].includes(range) ? { year: "2-digit", month: "short" } : { month: "short", day: "numeric" }),
    timeZone: activeChart?.timezone,
  }), [activeChart?.timezone, language, range]);

  const previous = activeChart?.previous_close ?? activeChart?.points[0]?.price ?? 0;
  const current = liveQuote?.current_price ?? activeChart?.current_price ?? 0;
  const positive = current >= previous;
  const color = positive ? "#059669" : "#e11d48";

  return (
    <section className="rounded-md border border-slate-200 bg-white px-3 pb-3 pt-4 shadow-sm">
      <p className="mb-3 px-1 text-[10px] font-medium text-slate-400">{stock.symbol}</p>

      <div className="h-56 w-full" aria-label={`${stock.symbol} ${t("chartLabel")}`}>
        {isLoading && <div className="grid h-full place-items-center text-xs text-slate-400"><span className="animate-pulse">{t("chartLoading")}</span></div>}
        {!isLoading && error && <div className="grid h-full place-items-center px-5 text-center text-xs text-rose-600">{t("chartUnavailable")}</div>}
        {!isLoading && activeChart && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartView chart={activeChart} color={color} formatTimestamp={(value) => formatter.format(new Date(value * 1000))} />
          </ResponsiveContainer>
        )}
      </div>
      <div className="mb-1 mt-2 grid grid-cols-9 gap-0.5 px-1" aria-label={t("marketData")}>
        {ranges.map((item) => <button key={item} type="button" onClick={() => setRange(item)} className={`h-6 min-w-0 rounded px-0.5 text-[9px] font-semibold transition ${range === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{item}</button>)}
      </div>
      {activeChart?.previous_close != null && <p className="px-1 pt-1 text-[9px] text-slate-400">{t(range === "1D" ? "previousClose" : "periodStart")}: {Number(activeChart.previous_close).toLocaleString(undefined, { maximumFractionDigits: 2 })} {activeChart.currency}</p>}
    </section>
  );
}

function AreaChartView({ chart, color, formatTimestamp }: { chart: YahooChartResponse; color: string; formatTimestamp: (value: number) => string }) {
  return (
    <AreaChart data={chart.points} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#eef2f6" />
      <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={formatTimestamp} tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
      <YAxis domain={["auto", "auto"]} tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={55} />
      <Tooltip labelFormatter={(value) => formatTimestamp(Number(value))} formatter={(value) => [Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 }), "Price"]} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }} />
      <Area dataKey="price" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2} dot={false} isAnimationActive={false} />
    </AreaChart>
  );
}

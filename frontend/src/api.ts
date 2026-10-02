import type { ChartRange, StockApiResponse, YahooChartResponse, YahooStockResult } from "./types/stock";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const ACCESS_KEY = "pickinggeek_access";
const REFRESH_KEY = "pickinggeek_refresh";

export interface AuthTokens { access: string; refresh: string }
export type AnalysisMode = "auto" | "quick" | "deep";
export type StreamEvent =
  | { type: "meta"; model: string; mode: AnalysisMode }
  | { type: "token"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

async function authorizedFetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  const request = (access: string) => fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${access}` },
  });
  const storedAccess = localStorage.getItem(ACCESS_KEY) || token;
  let response = await request(storedAccess);
  if (response.status !== 401) return response;

  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return response;
  const refreshResponse = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!refreshResponse.ok) return response;
  const refreshed = await refreshResponse.json() as { access: string };
  localStorage.setItem(ACCESS_KEY, refreshed.access);
  response = await request(refreshed.access);
  return response;
}

export async function login(username: string, password: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error("帳號或密碼不正確");
  return response.json();
}

export async function loginWithGoogle(credential: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE}/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(payload.detail || `Google sign-in responded ${response.status}`);
  }
  return response.json();
}

export async function fetchStocks(token: string): Promise<StockApiResponse[]> {
  const response = await authorizedFetch(`${API_BASE}/stocks/`, token);
  if (!response.ok) throw new Error(`股票 API 回應 ${response.status}`);
  return response.json();
}

export async function searchYahooStocks(token: string, query: string, signal?: AbortSignal): Promise<YahooStockResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await authorizedFetch(`${API_BASE}/stocks/search/?${params}`, token, { signal });
  if (!response.ok) throw new Error(`Yahoo Finance search responded ${response.status}`);
  const payload = await response.json() as { results: YahooStockResult[] };
  return payload.results;
}

export async function addYahooStock(token: string, symbol: string): Promise<StockApiResponse> {
  const response = await authorizedFetch(`${API_BASE}/watchlist/yahoo/`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(payload.detail || `Watchlist API responded ${response.status}`);
  }
  return response.json();
}

export async function removeTrackedStock(token: string, stockId: number): Promise<void> {
  const response = await authorizedFetch(`${API_BASE}/watchlist/stocks/${stockId}/`, token, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Watchlist API responded ${response.status}`);
}

export async function fetchStockChart(token: string, stockId: number, range: ChartRange, signal?: AbortSignal): Promise<YahooChartResponse> {
  const params = new URLSearchParams({ range });
  const response = await authorizedFetch(`${API_BASE}/stocks/${stockId}/chart/?${params}`, token, { signal });
  if (!response.ok) throw new Error(`Yahoo Finance chart responded ${response.status}`);
  return response.json();
}

export async function streamAnalysis(options: {
  token: string;
  stockId: number;
  question: string;
  mode: AnalysisMode;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> {
  const response = await authorizedFetch(`${API_BASE}/ai/analyze/`, options.token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock_id: options.stockId, question: options.question, mode: options.mode }),
  });
  if (!response.ok) throw new Error(`AI API 回應 ${response.status}`);
  if (!response.body) throw new Error("瀏覽器不支援串流回應");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const packets = buffer.split("\n\n");
    buffer = packets.pop() || "";
    for (const packet of packets) {
      const line = packet.split("\n").find((item) => item.startsWith("data: "));
      if (line) options.onEvent(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }
}

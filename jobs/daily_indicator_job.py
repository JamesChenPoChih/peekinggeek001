"""Nebius Serverless Job entry point for post-close indicator refreshes."""

import json
import os
import re
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path

import httpx
import pandas as pd
import redis
from openai import OpenAI
from dotenv import load_dotenv


PROJECT_DIR = Path(__file__).resolve().parents[1]
DOTENV_PATH = PROJECT_DIR / ".env"
if DOTENV_PATH.is_file():
    load_dotenv(DOTENV_PATH)


def get_nebius_api_key() -> str:
    if api_key := os.getenv("NEBIUS_API_KEY"):
        return api_key
    configured_path = os.getenv("NEBIUS_API_KEY_FILE")
    token_candidates = [
        Path(configured_path) if configured_path else None,
        PROJECT_DIR / "Nebius_Picking_Geek_AI_API.txt",
        PROJECT_DIR / ".env" / "Nebius_Picking_Geek_AI_API.txt",
        PROJECT_DIR.parent / "Nebius_Picking_Geek_AI_API" / "Nebius_Picking_Geek_AI_API.txt",
    ]
    for token_path in filter(None, token_candidates):
        if not token_path.is_absolute():
            token_path = PROJECT_DIR / token_path
        if token_path.is_file():
            token_text = token_path.read_text(encoding="utf-8")
            token_match = re.search(r"\bv1\.[A-Za-z0-9._-]+\b", token_text)
            if token_match:
                return token_match.group(0)
    raise RuntimeError("NEBIUS_API_KEY or NEBIUS_API_KEY_FILE is required")


@dataclass
class IndicatorResult:
    symbol: str
    market: str
    as_of_date: str
    close: float
    macd: float
    signal: float
    histogram: float
    macd_status: str
    ma60: float | None
    ma100: float | None
    ma200: float | None
    above_ma60: bool | None
    above_ma100: bool | None
    above_ma200: bool | None


def fetch_daily_prices(symbol: str, market: str) -> pd.DataFrame:
    """Replace the example URL with Polygon, Finnhub, Fugle, or TWSE adapter."""
    base_url = os.getenv("MARKET_DATA_URL")
    if not base_url:
        raise RuntimeError("MARKET_DATA_URL 尚未設定")
    response = httpx.get(
        base_url,
        params={"symbol": symbol, "market": market, "days": 260},
        headers={"Authorization": f"Bearer {os.getenv('MARKET_DATA_API_KEY', '')}"},
        timeout=30,
    )
    response.raise_for_status()
    rows = response.json()["prices"]
    frame = pd.DataFrame(rows)
    frame["date"] = pd.to_datetime(frame["date"])
    return frame.sort_values("date")


def calculate_indicators(frame: pd.DataFrame, symbol: str, market: str) -> IndicatorResult:
    close = frame["close"].astype(float)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal_line
    mas = {days: close.rolling(days).mean().iloc[-1] for days in (60, 100, 200)}
    latest_close = float(close.iloc[-1])

    def optional_number(value):
        return None if pd.isna(value) else round(float(value), 4)

    latest_histogram = float(histogram.iloc[-1])
    return IndicatorResult(
        symbol=symbol,
        market=market,
        as_of_date=str(frame["date"].iloc[-1].date()),
        close=round(latest_close, 4),
        macd=round(float(macd_line.iloc[-1]), 6),
        signal=round(float(signal_line.iloc[-1]), 6),
        histogram=round(latest_histogram, 6),
        macd_status="BULLISH" if latest_histogram > 0 else "BEARISH" if latest_histogram < 0 else "NEUTRAL",
        ma60=optional_number(mas[60]),
        ma100=optional_number(mas[100]),
        ma200=optional_number(mas[200]),
        above_ma60=None if pd.isna(mas[60]) else latest_close > mas[60],
        above_ma100=None if pd.isna(mas[100]) else latest_close > mas[100],
        above_ma200=None if pd.isna(mas[200]) else latest_close > mas[200],
    )


def create_push_summary(result: IndicatorResult) -> str:
    client = OpenAI(
        api_key=get_nebius_api_key(),
        base_url=os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1"),
    )
    prompt = (
        "請以繁體中文將以下技術指標濃縮成 35 字內的一句推播，不預測報酬、不下買賣指令："
        f"{json.dumps(asdict(result), ensure_ascii=False)}"
    )
    response = client.chat.completions.create(
        model=os.getenv("NANO_MODEL", "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=80,
        extra_body={"chat_template_kwargs": {"enable_thinking": False}},
    )
    return response.choices[0].message.content.strip()


def enqueue_notification(result: IndicatorResult, summary: str):
    queue = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    queue.rpush(
        "pickinggeek:notifications",
        json.dumps({"indicator": asdict(result), "summary": summary}, ensure_ascii=False),
    )


def persist_to_api(result: IndicatorResult, summary: str):
    response = httpx.post(
        os.environ["INTERNAL_INDICATOR_WEBHOOK"],
        json={**asdict(result), "summary": summary},
        headers={"X-Job-Secret": os.environ["JOB_WEBHOOK_SECRET"]},
        timeout=30,
    )
    response.raise_for_status()


def handler(event=None, context=None):
    tracked = os.getenv("TRACKED_SYMBOLS", "AAPL:US,2330:TW").split(",")
    outcomes = []
    for item in tracked:
        symbol, market = item.strip().split(":", maxsplit=1)
        try:
            frame = fetch_daily_prices(symbol, market)
            result = calculate_indicators(frame, symbol, market)
            summary = create_push_summary(result)
            persist_to_api(result, summary)
            enqueue_notification(result, summary)
            outcomes.append({"symbol": symbol, "status": "ok"})
        except Exception as exc:
            outcomes.append({"symbol": symbol, "status": "error", "message": str(exc)})
    return {"date": date.today().isoformat(), "outcomes": outcomes}


if __name__ == "__main__":
    print(json.dumps(handler(), ensure_ascii=False, indent=2))

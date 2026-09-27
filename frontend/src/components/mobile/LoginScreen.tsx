import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, TrendingUp } from "lucide-react";

import { login, type AuthTokens } from "../../api";
import { useLanguage } from "../../i18n";

interface LoginScreenProps {
  onLogin: (tokens: AuthTokens) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      onLogin(await login(username, password));
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message === "Failed to fetch" ? loginError.message : t("loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-between bg-white px-6 py-8 shadow-xl">
      <div>
        <div className="mb-16 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-slate-950 text-white">
            <TrendingUp size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-black text-slate-950">PickingGeek</p>
            <p className="text-xs text-slate-500">AI Investment Copilot</p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950">{t("welcomeBack")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("loginSubtitle")}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            {t("username")}
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-slate-950"
              autoComplete="username"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-slate-950"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          >
            {loading ? t("loggingIn") : t("login")}
            {!loading && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
        <LockKeyhole size={13} aria-hidden="true" />
        <span>{t("secureTransfer")}</span>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Mode = "magic" | "password";

export default function AdminLogin() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function supabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async function onSubmitMagic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Admin prihlásenie</h1>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => { setMode("password"); setSent(false); setError(null); }}
          className={`flex-1 rounded px-3 py-1 ${mode === "password" ? "bg-neutral-900 text-white" : "border"}`}
        >
          Heslo
        </button>
        <button
          type="button"
          onClick={() => { setMode("magic"); setSent(false); setError(null); }}
          className={`flex-1 rounded px-3 py-1 ${mode === "magic" ? "bg-neutral-900 text-white" : "border"}`}
        >
          Magic link
        </button>
      </div>

      {mode === "magic" && sent ? (
        <p className="text-sm text-neutral-700">Skontroluj si schránku, posiela sa magic link.</p>
      ) : mode === "magic" ? (
        <form onSubmit={onSubmitMagic} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ty@firma.sk"
            className="w-full rounded border px-3 py-2"
          />
          <button disabled={loading} className="w-full rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {loading ? "Posiela sa…" : "Poslať magic link"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <form onSubmit={onSubmitPassword} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ty@firma.sk"
            className="w-full rounded border px-3 py-2"
            autoComplete="username"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            className="w-full rounded border px-3 py-2"
            autoComplete="current-password"
          />
          <button disabled={loading} className="w-full rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {loading ? "Prihlasujem…" : "Prihlásiť sa"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-neutral-500">
            Heslo si nastav v Supabase Auth → Users → svoj účet → Update password (alebo vytvor nového usera s heslom).
          </p>
        </form>
      )}
    </div>
  );
}

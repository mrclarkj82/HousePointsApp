import { Chrome, ScrollText, Sparkles } from "lucide-react";
import { useState } from "react";
import HouseCrest from "../components/HouseCrest";
import { signInWithGoogle } from "../services/firebase";
import { HOUSES, classNames } from "../utils/constants";

export default function LoginPage({ error }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleLogin() {
    setBusy(true);
    setLocalError("");
    try {
      await signInWithGoogle();
    } catch (loginError) {
      setLocalError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <section className="hero-image relative isolate flex min-h-[78vh] items-end overflow-hidden px-4 py-8 sm:px-6 lg:min-h-[82vh] lg:py-12">
        <div className="sparkle-field absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end">
          <div className="max-w-3xl pb-5 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-white/10 px-3 py-2 text-sm font-bold text-amber-100 shadow-soft backdrop-blur">
              <Sparkles size={18} aria-hidden="true" />
              Doral Red Rock
            </div>
            <h1 className="mt-5 max-w-[23rem] text-[2.2rem] font-black leading-[1.08] tracking-normal text-white sm:max-w-3xl sm:text-6xl lg:text-7xl">
              Doral Red Rock House Points
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-amber-50 sm:text-xl">
              A magical house adventure for celebrating leadership, kindness, courage, and school spirit.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleLogin} disabled={busy} className="btn-primary w-full sm:w-auto">
                <Chrome size={22} aria-hidden="true" />
                {busy ? "Opening Google" : "Sign in with Google"}
              </button>
              <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-amber-200/40 bg-slate-950/40 px-4 py-3 text-base font-bold text-amber-50 backdrop-blur">
                <ScrollText size={20} aria-hidden="true" />
                Four houses. One grand quest.
              </div>
            </div>
            {localError || error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {localError || error}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative -mt-12 px-4 pb-8 sm:px-6 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {HOUSES.map((house, index) => (
              <article
                key={house.id}
                className={classNames(
                  "adventure-surface min-h-36 rounded-lg border p-4 shadow-soft ring-1 ring-white/80",
                  house.border
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-normal text-slate-500">House {index + 1}</p>
                    <h2 className="mt-1 text-3xl font-black text-slate-950">{house.name}</h2>
                  </div>
                  <HouseCrest houseId={house.id} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className={classNames("h-full rounded-full", house.bg)} style={{ width: `${55 + index * 10}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

import { Chrome, ShieldCheck, Trophy } from "lucide-react";
import { useState } from "react";
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
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.85fr]">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-doral-red">
            <ShieldCheck size={18} aria-hidden="true" />
            Doral Red Rock
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            House points for every student moment.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Students see their progress, teachers award points fast, and admins keep a clean audit trail.
          </p>
          <button type="button" onClick={handleLogin} disabled={busy} className="btn-primary mt-7 w-full sm:w-auto">
            <Chrome size={22} aria-hidden="true" />
            {busy ? "Opening Google" : "Sign in with Google"}
          </button>
          {localError || error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {localError || error}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {HOUSES.map((house, index) => (
            <article
              key={house.id}
              className={classNames("rounded-lg border bg-white p-5 shadow-soft", house.border)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">House {index + 1}</p>
                  <h2 className="mt-1 text-3xl font-black text-slate-950">{house.name}</h2>
                </div>
                <div className={classNames("grid h-14 w-14 place-items-center rounded-lg text-white", house.bg)}>
                  <Trophy size={26} aria-hidden="true" />
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

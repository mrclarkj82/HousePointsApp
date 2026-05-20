import { Check, Search, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import HouseBadge from "../components/HouseBadge";
import {
  awardPoints,
  listenCategories,
  listenHouses,
  listenSeasons,
  listenStudents,
  listenTeacherAwards,
} from "../services/firestore";
import {
  DEFAULT_CATEGORIES,
  HOUSES,
  classNames,
  formatDateTime,
  getActiveSeasonId,
  getHouseName,
} from "../utils/constants";

const QUICK_AMOUNTS = [1, 5, 10, 25];

export default function TeacherDashboard({ profile }) {
  const [students, setStudents] = useState([]);
  const [houses, setHouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [recentAwards, setRecentAwards] = useState([]);
  const [mode, setMode] = useState("students");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [period, setPeriod] = useState("");
  const [houseId, setHouseId] = useState("verax");
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmit, setLastSubmit] = useState({ key: "", at: 0 });

  useEffect(() => {
    const onError = (nextError) => setError(nextError.message);
    const teacherId = profile.teacherId || profile.id || profile.uid;
    const unsubscribers = [
      listenStudents(setStudents, onError),
      listenHouses(setHouses, onError),
      listenCategories(setCategories, onError),
      listenSeasons(setSeasons, onError),
      listenTeacherAwards(teacherId, setRecentAwards, onError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [profile]);

  const activeCategories = useMemo(() => {
    const live = categories.filter((item) => item.active && !item.deleted);
    return live.length ? live : DEFAULT_CATEGORIES.map((name) => ({ id: name, name, active: true }));
  }, [categories]);

  const houseOptions = houses.length ? houses : HOUSES;
  const periods = useMemo(
    () => [...new Set(students.map((student) => student.period).filter(Boolean))].sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students
      .filter((student) => student.active !== false)
      .filter((student) => {
        if (!term) return true;
        return [student.name, student.grade, student.period, getHouseName(student.houseId)]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 60);
  }, [search, students]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.includes(student.id)),
    [selectedIds, students]
  );

  const periodStudents = useMemo(
    () => students.filter((student) => student.active !== false && student.period === period),
    [period, students]
  );

  const resolvedAmount = Number(customAmount || amount);
  const targetCount = mode === "students" ? selectedStudents.length : mode === "period" ? periodStudents.length : 1;

  function toggleStudent(studentId) {
    setSelectedIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!resolvedAmount || resolvedAmount <= 0) {
      setError("Choose a point amount.");
      return;
    }
    if (!category) {
      setError("Choose a reason/category.");
      return;
    }
    if (mode === "students" && !selectedStudents.length) {
      setError("Select at least one student.");
      return;
    }
    if (mode === "period" && !periodStudents.length) {
      setError("Choose a period with students.");
      return;
    }

    const submitKey = JSON.stringify({
      mode,
      amount: resolvedAmount,
      category,
      note,
      ids: mode === "students" ? [...selectedIds].sort() : mode === "period" ? [period] : [houseId],
    });
    const now = Date.now();
    if (lastSubmit.key === submitKey && now - lastSubmit.at < 10000) {
      setStatus("Duplicate submission prevented.");
      return;
    }

    setSubmitting(true);
    try {
      const count = await awardPoints({
        teacherProfile: profile,
        students: mode === "students" ? selectedStudents : mode === "period" ? periodStudents : [],
        directHouseId: mode === "house" ? houseId : "",
        amount: resolvedAmount,
        category,
        note,
        seasonId: getActiveSeasonId(seasons),
        awardType: mode === "students" ? (selectedStudents.length > 1 ? "group" : "individual") : mode === "period" ? "class" : "house",
      });
      setLastSubmit({ key: submitKey, at: now });
      setStatus(`Awarded +${resolvedAmount} to ${count} ${count === 1 ? "target" : "targets"}.`);
      setSelectedIds([]);
      setNote("");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-doral-red">Fast Award</p>
              <h2 className="section-title">Award points</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
              {[
                ["students", "Students"],
                ["period", "Period"],
                ["house", "House"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={classNames(
                    "min-h-11 rounded-lg px-3 text-sm font-black",
                    mode === id ? "bg-white text-doral-red shadow-sm" : "text-slate-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {status ? (
            <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              <Check size={18} aria-hidden="true" />
              {status}
            </p>
          ) : null}
        </section>

        {mode === "students" ? (
          <section className="panel">
            <label className="label" htmlFor="student-search">
              Search students
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                id="student-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-12"
                placeholder="Name, grade, period, or house"
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredStudents.length ? (
                filteredStudents.map((student) => {
                  const selected = selectedIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={classNames(
                        "min-h-24 rounded-lg border p-4 text-left transition active:scale-[0.99]",
                        selected ? "border-doral-red bg-red-50" : "border-slate-200 bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-slate-950">{student.name}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            Grade {student.grade || "-"} · {student.period || "No period"}
                          </p>
                        </div>
                        <span
                          className={classNames(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
                            selected ? "border-doral-red bg-doral-red text-white" : "border-slate-200 bg-slate-50 text-slate-400"
                          )}
                        >
                          <Check size={18} aria-hidden="true" />
                        </span>
                      </div>
                      <div className="mt-3">
                        <HouseBadge houseId={student.houseId} />
                      </div>
                    </button>
                  );
                })
              ) : (
                <EmptyState title="No students found" body="Try a name, period, grade, or house." />
              )}
            </div>
          </section>
        ) : null}

        {mode === "period" ? (
          <section className="panel">
            <label className="label" htmlFor="period-select">
              Period or advisory
            </label>
            <select id="period-select" value={period} onChange={(event) => setPeriod(event.target.value)} className="input mt-2">
              <option value="">Choose a period</option>
              {periods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              {periodStudents.length} students selected
            </p>
          </section>
        ) : null}

        {mode === "house" ? (
          <section className="panel">
            <p className="label">House</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {houseOptions.map((house) => (
                <button
                  key={house.id}
                  type="button"
                  onClick={() => setHouseId(house.id)}
                  className={classNames(
                    "min-h-20 rounded-lg border p-4 text-left text-lg font-black transition active:scale-[0.99]",
                    houseId === house.id ? "border-doral-red bg-red-50 text-doral-red" : "border-slate-200 bg-white text-slate-950"
                  )}
                >
                  {house.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="label">Point amount</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAmount(value);
                      setCustomAmount("");
                    }}
                    className={classNames(
                      "min-h-14 rounded-lg text-xl font-black",
                      !customAmount && amount === value ? "bg-doral-red text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    +{value}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                className="input mt-3"
                placeholder="Custom amount"
              />
            </div>

            <div>
              <p className="label">Category</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeCategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.name)}
                    className={classNames(
                      "min-h-12 rounded-lg px-3 text-left text-sm font-bold",
                      category === item.name ? "bg-doral-red text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="label mt-5 block" htmlFor="award-note">
            Optional note
          </label>
          <textarea
            id="award-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="input mt-2 min-h-24"
            placeholder="Short note"
          />

          <button type="submit" disabled={submitting || targetCount < 1} className="btn-primary mt-5 w-full">
            <Send size={20} aria-hidden="true" />
            {submitting ? "Awarding points" : `Award +${resolvedAmount || 0} to ${targetCount} target${targetCount === 1 ? "" : "s"}`}
          </button>
        </section>
      </form>

      <aside className="space-y-5">
        <section className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-slate-500">Selected</p>
              <p className="text-3xl font-black text-slate-950">{targetCount}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white">
              <Users size={24} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="text-lg font-black text-slate-950">Recent awards</h2>
          <div className="mt-4 space-y-3">
            {recentAwards.length ? (
              recentAwards.map((award) => (
                <article key={award.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-950">+{award.amount} {award.category}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {award.studentName || award.houseName || getHouseName(award.houseId)}
                      </p>
                    </div>
                    {award.reversed ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Reversed</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{formatDateTime(award.createdAt)}</p>
                </article>
              ))
            ) : (
              <EmptyState title="No recent awards" />
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

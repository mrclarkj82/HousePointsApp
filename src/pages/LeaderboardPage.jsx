import { BarChart3, Medal, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import Leaderboard from "../components/Leaderboard";
import { listenHouses, listenPointTransactions } from "../services/firestore";
import {
  HOUSES,
  LEADERBOARD_FILTERS,
  classNames,
  getDateRangeStart,
  sortHousesByPoints,
} from "../utils/constants";

function toDate(value) {
  if (!value) return null;
  return typeof value.toDate === "function" ? value.toDate() : new Date(value);
}

function topFromMap(map, limit = 5) {
  return [...map.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export default function LeaderboardPage({ profile }) {
  const [houses, setHouses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("full_year");
  const [error, setError] = useState("");
  const canReadActivity = profile.role === "teacher" || profile.role === "admin";

  useEffect(() => {
    const onError = (nextError) => setError(nextError.message);
    const unsubscribeHouses = listenHouses(setHouses, onError);
    const unsubscribeTransactions = canReadActivity ? listenPointTransactions(setTransactions, onError) : () => {};
    return () => {
      unsubscribeHouses();
      unsubscribeTransactions();
    };
  }, [canReadActivity]);

  const filteredTransactions = useMemo(() => {
    if (!canReadActivity) return [];
    const start = getDateRangeStart(filter);
    return transactions.filter((transaction) => {
      if (transaction.reversed) return false;
      const created = toDate(transaction.createdAt);
      return created && created >= start;
    });
  }, [canReadActivity, filter, transactions]);

  const filteredHouses = useMemo(() => {
    if (!canReadActivity || filter === "full_year") {
      return houses.length ? houses : HOUSES.map((house) => ({ ...house, totalPoints: 0 }));
    }

    const totals = new Map(HOUSES.map((house) => [house.id, 0]));
    filteredTransactions.forEach((transaction) => {
      totals.set(transaction.houseId, (totals.get(transaction.houseId) || 0) + Number(transaction.amount || 0));
    });
    return HOUSES.map((house) => ({ ...house, totalPoints: totals.get(house.id) || 0 }));
  }, [canReadActivity, filter, filteredTransactions, houses]);

  const insights = useMemo(() => {
    const students = new Map();
    const categories = new Map();
    const teachers = new Map();

    filteredTransactions.forEach((transaction) => {
      const amount = Number(transaction.amount || 0);
      if (transaction.studentName) students.set(transaction.studentName, (students.get(transaction.studentName) || 0) + amount);
      if (transaction.category) categories.set(transaction.category, (categories.get(transaction.category) || 0) + amount);
      if (transaction.teacherName) teachers.set(transaction.teacherName, (teachers.get(transaction.teacherName) || 0) + 1);
    });

    return {
      students: topFromMap(students),
      categories: topFromMap(categories),
      teachers: topFromMap(teachers).map((item) => ({ ...item, pointsLabel: `${item.points} awards` })),
    };
  }, [filteredTransactions]);

  const ranked = sortHousesByPoints(filteredHouses);

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-doral-red">Leaderboard</p>
            <h2 className="section-title">House rankings</h2>
            <p className="mt-2 text-slate-600">
              {ranked[0]?.name || "Houses"} leads with {Number(ranked[0]?.totalPoints || 0).toLocaleString()} points.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {LEADERBOARD_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                disabled={!canReadActivity && item.id !== "full_year"}
                className={classNames(
                  "min-h-11 rounded-lg px-3 text-sm font-bold",
                  filter === item.id ? "bg-doral-red text-white" : "bg-slate-100 text-slate-700",
                  !canReadActivity && item.id !== "full_year" ? "opacity-45" : ""
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Leaderboard houses={filteredHouses} />

      {canReadActivity ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <InsightCard icon={Medal} title="Top Students" rows={insights.students} empty="No student points in this range." />
          <InsightCard icon={Sparkles} title="Top Categories" rows={insights.categories} empty="No categories in this range." />
          <InsightCard icon={Users} title="Active Teachers" rows={insights.teachers} empty="No teacher activity in this range." />
        </section>
      ) : (
        <section className="panel">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-doral-red" size={24} aria-hidden="true" />
            <p className="font-semibold text-slate-700">Students see public house totals and their own award history.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function InsightCard({ icon: Icon, title, rows, empty }) {
  return (
    <article className="panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <Icon className="text-doral-red" size={22} aria-hidden="true" />
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">{row.name}</p>
              </div>
              <p className="shrink-0 text-lg font-black text-slate-950">{row.pointsLabel || row.points}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={empty} />
      )}
    </article>
  );
}

import { Activity, ArrowLeft, Clock, Medal, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import HouseBadge from "../components/HouseBadge";
import HouseCrest from "../components/HouseCrest";
import { listenHouses, listenLatestPointTransaction, listenPointTransactionsSince } from "../services/firestore";
import { HOUSES, classNames, formatDateTime, getDateRangeStart, getHouseName, sortHousesByPoints } from "../utils/constants";

function toDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTransactionPoints(transaction) {
  return Number(transaction?.points ?? transaction?.amount ?? 0);
}

function getTransactionCategory(transaction) {
  return transaction?.categoryName || transaction?.category || "Uncategorized";
}

function mergeHouseRecords(houses) {
  const byId = new Map(houses.map((house) => [house.id, house]));
  const officialHouses = HOUSES.map((house) => {
    const stored = byId.get(house.id) || {};
    return {
      ...house,
      ...stored,
      totalPoints: Number(stored.totalPoints ?? 0),
    };
  });

  const extraHouses = houses.filter((house) => !HOUSES.some((official) => official.id === house.id));
  return [...officialHouses, ...extraHouses];
}

export default function LiveScoresPage() {
  const [houses, setHouses] = useState([]);
  const [quarterTransactions, setQuarterTransactions] = useState([]);
  const [latestTransaction, setLatestTransaction] = useState(null);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [error, setError] = useState("");
  const quarterStart = useMemo(() => getDateRangeStart("quarter"), []);

  useEffect(() => {
    const onError = () => {
      setError("Live scores could not load. Please refresh or try again.");
      setLoadingHouses(false);
      setLoadingTransactions(false);
      setLoadingLatest(false);
    };

    const unsubscribers = [
      listenHouses(
        (nextHouses) => {
          setHouses(nextHouses);
          setLoadingHouses(false);
        },
        onError
      ),
      listenPointTransactionsSince(
        quarterStart,
        (nextTransactions) => {
          setQuarterTransactions(nextTransactions);
          setLoadingTransactions(false);
        },
        onError
      ),
      listenLatestPointTransaction(
        (nextTransaction) => {
          setLatestTransaction(nextTransaction);
          setLoadingLatest(false);
        },
        onError
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [quarterStart]);

  const houseRows = useMemo(() => sortHousesByPoints(mergeHouseRecords(houses)), [houses]);
  const maxHousePoints = Math.max(...houseRows.map((house) => Number(house.totalPoints || 0)), 1);
  const quarterName = useMemo(() => `Quarter ${Math.floor(new Date().getMonth() / 3) + 1}`, []);

  const latestAward = useMemo(() => {
    if (latestTransaction && !latestTransaction.reversed) return latestTransaction;
    return quarterTransactions.find((transaction) => !transaction.reversed) || null;
  }, [latestTransaction, quarterTransactions]);

  const topStudentsByHouse = useMemo(() => {
    const totals = new Map();
    quarterTransactions.forEach((transaction) => {
      if (transaction.reversed || !transaction.studentId || !transaction.houseId) return;
      const createdAt = toDate(transaction.createdAt || transaction.awardedAt);
      if (!createdAt || createdAt < quarterStart) return;

      const points = getTransactionPoints(transaction);
      if (!points) return;
      const houseId = transaction.houseId;
      if (!totals.has(houseId)) totals.set(houseId, new Map());
      const houseTotals = totals.get(houseId);
      const current = houseTotals.get(transaction.studentId) || {
        studentId: transaction.studentId,
        studentName: transaction.studentName || transaction.studentId,
        total: 0,
      };
      houseTotals.set(transaction.studentId, {
        ...current,
        total: current.total + points,
      });
    });

    return Object.fromEntries(
      houseRows.map((house) => {
        const leaders = [...(totals.get(house.id)?.values() || [])].sort((a, b) => {
          const pointDiff = b.total - a.total;
          if (pointDiff !== 0) return pointDiff;
          return String(a.studentName || "").localeCompare(String(b.studentName || ""));
        });
        return [house.id, leaders[0] || null];
      })
    );
  }, [houseRows, quarterStart, quarterTransactions]);

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-doral-red">Live Scores</p>
            <h2 className="section-title">House standings in real time</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Watch each award ripple into the house totals, latest point moment, and current-quarter student leaders.
            </p>
          </div>
          <Link to="/teacher" className="btn-secondary w-full sm:w-auto">
            <ArrowLeft size={18} aria-hidden="true" />
            Award points
          </Link>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Live house scores</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Ranked by total points</p>
            </div>
            <Trophy className="text-doral-red" size={24} aria-hidden="true" />
          </div>

          {loadingHouses ? (
            <LoadingCardGrid />
          ) : houseRows.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {houseRows.map((house, index) => {
                const total = Number(house.totalPoints || 0);
                const width = `${Math.max(4, Math.round((total / maxHousePoints) * 100))}%`;
                return (
                  <article key={house.id} className="adventure-surface rounded-lg border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <HouseCrest houseId={house.id} />
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-normal text-doral-red">Rank {index + 1}</p>
                          <h4 className="truncate text-xl font-black text-slate-950">{house.name || getHouseName(house.id)}</h4>
                        </div>
                      </div>
                      <p className="text-right text-3xl font-black text-slate-950">{total.toLocaleString()}</p>
                    </div>
                    <div className="mt-4 h-3 rounded-full bg-white/85 ring-1 ring-amber-200">
                      <div className="h-full rounded-full" style={{ width, backgroundColor: house.hex || "#991b1b" }} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No houses found" body="Seed the default house records from Admin setup." />
          )}
        </section>

        <section className="panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Most recent award</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Updates as points are awarded</p>
            </div>
            <Activity className="text-doral-red" size={24} aria-hidden="true" />
          </div>

          {loadingLatest && loadingTransactions ? (
            <LoadingLineCard />
          ) : latestAward ? (
            <article className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm" aria-live="polite">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-red-800 to-amber-700 text-white">
                  <UserRound size={24} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-slate-950">
                    {latestAward.studentName || latestAward.houseName || getHouseName(latestAward.houseId)}
                  </p>
                  <div className="mt-2">
                    <HouseBadge houseId={latestAward.houseId} />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ScoreFact label="Points" value={`+${getTransactionPoints(latestAward).toLocaleString()}`} />
                <ScoreFact label="Category" value={getTransactionCategory(latestAward)} />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Awarded by {latestAward.awardedByName || latestAward.teacherName || "Unknown teacher"}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Clock size={16} aria-hidden="true" />
                {formatDateTime(latestAward.createdAt || latestAward.awardedAt)}
              </p>
            </article>
          ) : (
            <EmptyState title="No awards yet" body="The first point award will appear here automatically." />
          )}
        </section>
      </div>

      <section className="panel">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">Current-quarter top students</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {quarterName}, starting {quarterStart.toLocaleDateString()}
            </p>
          </div>
          <Medal className="text-doral-red" size={24} aria-hidden="true" />
        </div>

        {loadingTransactions ? (
          <LoadingCardGrid count={4} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {houseRows.map((house) => {
              const leader = topStudentsByHouse[house.id];
              return (
                <article key={house.id} className="rounded-lg border border-amber-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <HouseCrest houseId={house.id} size="sm" />
                    <div>
                      <h4 className="font-black text-slate-950">{house.name || getHouseName(house.id)}</h4>
                      <p className="text-sm font-semibold text-slate-500">Top student</p>
                    </div>
                  </div>
                  {leader ? (
                    <div className="mt-4">
                      <p className="text-lg font-black text-slate-950">{leader.studentName}</p>
                      <p className="mt-1 text-3xl font-black text-doral-red">+{leader.total.toLocaleString()}</p>
                      <p className="text-sm font-semibold text-slate-500">points this quarter</p>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold text-slate-600">
                      No points yet this quarter.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ScoreFact({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function LoadingCardGrid({ count = 4 }) {
  return (
    <div className={classNames("grid gap-3", count > 2 ? "md:grid-cols-2" : "")}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-h-32 animate-pulse rounded-lg border border-amber-100 bg-amber-50/60" />
      ))}
    </div>
  );
}

function LoadingLineCard() {
  return <div className="min-h-64 animate-pulse rounded-lg border border-amber-100 bg-amber-50/60" />;
}

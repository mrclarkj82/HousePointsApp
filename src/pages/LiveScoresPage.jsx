import { ArrowLeft, Clock, Maximize2, Minimize2, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HouseCrest from "../components/HouseCrest";
import { listenHouses, listenLatestPointTransaction, listenPointTransactionsSince } from "../services/firestore";
import { HOUSES, formatDateTime, getDateRangeStart, getHouseName, sortHousesByPoints } from "../utils/constants";

function toDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTransactionPoints(transaction) {
  return Number(transaction?.points ?? transaction?.amount ?? 0);
}

function getTransactionCategory(transaction) {
  return transaction?.categoryName || transaction?.category || "House Points";
}

function getTransactionId(transaction) {
  return transaction?.transactionId || transaction?.id || "latest-award";
}

function formatScore(points) {
  return `${Math.round(Number(points || 0))} Pts`;
}

function ordinal(rank) {
  const ones = rank % 10;
  const tens = rank % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ones === 1 ? "st" : ones === 2 ? "nd" : ones === 3 ? "rd" : "th";
  return { number: rank, suffix };
}

function initialsFor(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "HP";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return "153, 27, 27";
  const value = Number.parseInt(clean, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
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

function houseStyle(house) {
  const hex = house?.hex || "#991b1b";
  return {
    "--house-color": hex,
    "--house-rgb": hexToRgb(hex),
  };
}

function placementForRank(rank) {
  if (rank === 1) return "first";
  if (rank === 2) return "second";
  if (rank === 3) return "third";
  return "fourth";
}

export default function LiveScoresPage({ displayMode = false }) {
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

  const loading = loadingHouses || loadingTransactions || loadingLatest;

  return (
    <div className="school-leaderboard-page" aria-busy={loading}>
      <HallBackground />
      <div className="school-leaderboard-stage">
        <header className="school-leaderboard-header">
          <div className="leaderboard-ribbon" aria-label="School Leaderboard">
            <span>School Leaderboard</span>
          </div>
          <div className="scoreboard-actions">
            {displayMode ? (
              <Link to="/live-scores" className="scoreboard-action-button">
                <Minimize2 size={18} aria-hidden="true" />
                Exit Display
              </Link>
            ) : (
              <>
                <Link to="/teacher" className="scoreboard-action-button">
                  <ArrowLeft size={18} aria-hidden="true" />
                  Award
                </Link>
                <Link to="/live-scores/display" className="scoreboard-action-button">
                  <Maximize2 size={18} aria-hidden="true" />
                  Display
                </Link>
              </>
            )}
          </div>
        </header>

        {error ? <p className="scoreboard-error">{error}</p> : null}

        <section className="house-banner-grid" aria-label="Live house rankings">
          {houseRows.slice(0, 4).map((house, index) => (
            <HouseBanner key={house.id} house={house} rank={index + 1} loading={loadingHouses} />
          ))}
        </section>

        <section className="scoreboard-lower" aria-label="Recent awards and quarter leaders">
          <RecentAwardSpotlight latestAward={latestAward} loading={loadingLatest && loadingTransactions} />
          <QuarterLeaders
            houseRows={houseRows}
            topStudentsByHouse={topStudentsByHouse}
            loading={loadingTransactions}
            quarterName={quarterName}
            quarterStart={quarterStart}
          />
        </section>
      </div>
    </div>
  );
}

function HallBackground() {
  return (
    <div className="school-hall-background" aria-hidden="true">
      <div className="hall-window hall-window--left">
        <span />
        <span />
        <span />
      </div>
      <div className="hall-window hall-window--right">
        <span />
        <span />
        <span />
      </div>
      <div className="hall-arch" />
      <div className="hall-floor" />
    </div>
  );
}

function HouseBanner({ house, rank, loading }) {
  const placement = placementForRank(rank);
  const rankLabel = ordinal(rank);
  const total = Number(house.totalPoints || 0);

  return (
    <div className={`house-banner-slot house-banner-slot--${placement}`}>
      <article className={`house-banner house-banner--${placement}`} style={houseStyle(house)}>
        <span className="house-banner__chain house-banner__chain--left" aria-hidden="true" />
        <span className="house-banner__chain house-banner__chain--right" aria-hidden="true" />
        <span className="house-banner__rod" aria-hidden="true" />
        <div className="house-banner__cloth">
          {rank === 1 ? (
            <div className="house-banner__crown" aria-hidden="true">
              <Trophy size={30} />
            </div>
          ) : null}
          <div className="house-banner__rank" aria-label={`${rankLabel.number}${rankLabel.suffix} place`}>
            <span>{rankLabel.number}</span>
            <small>{rankLabel.suffix}</small>
          </div>
          <div className="house-banner__crest">
            <HouseCrest houseId={house.id} size={rank === 1 ? "lg" : "md"} />
          </div>
          <h2>{house.name || getHouseName(house.id)}</h2>
          <p key={`${house.id}-${total}`} className="house-banner__score score-update-pulse">
            {loading ? "Loading" : formatScore(total)}
          </p>
        </div>
      </article>
    </div>
  );
}

function RecentAwardSpotlight({ latestAward, loading }) {
  const name = latestAward?.studentName || latestAward?.houseName || getHouseName(latestAward?.houseId);
  const points = getTransactionPoints(latestAward);

  return (
    <article
      key={latestAward ? getTransactionId(latestAward) : "empty-recent-award"}
      className="recent-award-plaque score-update-pulse"
      style={houseStyle(HOUSES.find((house) => house.id === latestAward?.houseId) || {})}
      aria-live="polite"
    >
      <div className="plaque-heading">
        <Sparkles size={18} aria-hidden="true" />
        Recent Award
      </div>
      {loading ? (
        <div className="plaque-empty">Loading latest award</div>
      ) : latestAward ? (
        <>
          <div className="recent-award-main">
            <div className="student-avatar">{initialsFor(name)}</div>
            <div className="min-w-0">
              <h2>{name}</h2>
              <p>{getHouseName(latestAward.houseId)}</p>
            </div>
          </div>
          <div className="recent-award-details">
            <strong>+{formatScore(points)}</strong>
            <span>{getTransactionCategory(latestAward)}</span>
          </div>
          <div className="recent-award-meta">
            <span>{latestAward.awardedByName || latestAward.teacherName || "Unknown teacher"}</span>
            <span>
              <Clock size={15} aria-hidden="true" />
              {formatDateTime(latestAward.createdAt || latestAward.awardedAt)}
            </span>
          </div>
        </>
      ) : (
        <div className="plaque-empty">No awards yet</div>
      )}
    </article>
  );
}

function QuarterLeaders({ houseRows, topStudentsByHouse, loading, quarterName, quarterStart }) {
  return (
    <article className="quarter-leaders-panel">
      <div className="quarter-leaders-title">
        <Trophy size={19} aria-hidden="true" />
        <div>
          <h2>Top Students</h2>
          <p>
            {quarterName}, starting {quarterStart.toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="student-plaque-grid">
        {houseRows.slice(0, 4).map((house) => {
          const leader = topStudentsByHouse[house.id];
          return <StudentPlaque key={house.id} house={house} leader={leader} loading={loading} />;
        })}
      </div>
    </article>
  );
}

function StudentPlaque({ house, leader, loading }) {
  const name = leader?.studentName || "No points yet.";
  return (
    <article className="student-plaque" style={houseStyle(house)}>
      <span className="student-plaque__rod" aria-hidden="true" />
      <div className="student-plaque__avatar">{leader ? initialsFor(name) : "..."}</div>
      <div className="student-plaque__body">
        <p className="student-plaque__house">{house.name || getHouseName(house.id)}</p>
        {loading ? (
          <h3>Loading</h3>
        ) : leader ? (
          <>
            <h3>{name}</h3>
            <p className="student-plaque__points">+{formatScore(leader.total)}</p>
          </>
        ) : (
          <h3>No points yet.</h3>
        )}
      </div>
    </article>
  );
}

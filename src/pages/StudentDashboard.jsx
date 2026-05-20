import { Award, CalendarDays, GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import HouseCrest from "../components/HouseCrest";
import HouseBadge from "../components/HouseBadge";
import Leaderboard from "../components/Leaderboard";
import { listenHouses, listenRecentStudentAwards, listenStudent } from "../services/firestore";
import { HOUSES, formatDate, getHouseName, sortHousesByPoints } from "../utils/constants";

export default function StudentDashboard({ profile }) {
  const [student, setStudent] = useState(null);
  const [awards, setAwards] = useState([]);
  const [houses, setHouses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const onError = (nextError) => setError(nextError.message);
    const unsubscribeStudent = listenStudent(profile.studentId, setStudent, onError);
    const unsubscribeAwards = listenRecentStudentAwards(profile.studentId, setAwards, onError);
    const unsubscribeHouses = listenHouses(setHouses, onError);
    return () => {
      unsubscribeStudent();
      unsubscribeAwards();
      unsubscribeHouses();
    };
  }, [profile.studentId]);

  const displayHouses = houses.length ? houses : HOUSES.map((house) => ({ ...house, totalPoints: 0 }));
  const rankedHouses = useMemo(() => sortHousesByPoints(displayHouses), [displayHouses]);
  const studentHouseRank = rankedHouses.findIndex((house) => house.id === student?.houseId) + 1;
  const studentHouse = rankedHouses.find((house) => house.id === student?.houseId);

  if (!profile.studentId) {
    return (
      <section className="panel">
        <h2 className="section-title">Student profile needed</h2>
        <p className="mt-2 text-slate-600">This account is signed in but is not linked to an imported student yet.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-doral-red">Student Dashboard</p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">{student?.name || profile.displayName}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  <GraduationCap size={16} aria-hidden="true" />
                  Grade {student?.grade || "Not set"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  <CalendarDays size={16} aria-hidden="true" />
                  {student?.period || "No period"}
                </span>
                <HouseBadge houseId={student?.houseId} />
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-slate-950 to-red-950 p-4 text-white ring-1 ring-amber-200/30 sm:min-w-48">
              <p className="text-sm font-bold text-slate-300">Personal points</p>
              <p className="mt-1 text-5xl font-black">{Number(student?.totalPoints || 0).toLocaleString()}</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-slate-500">House Standing</p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">{getHouseName(student?.houseId)}</h2>
            </div>
            <HouseCrest houseId={student?.houseId} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Rank</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{studentHouseRank || "-"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">House points</p>
              <p className="mt-1 text-3xl font-black text-slate-950">
                {Number(studentHouse?.totalPoints || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-title">House Leaderboard</h2>
        </div>
        <Leaderboard houses={displayHouses} />
      </section>

      <section className="panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">Recent Awards</h2>
          <Award className="text-doral-red" size={24} aria-hidden="true" />
        </div>
        {awards.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {awards.map((award) => (
              <article key={award.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">+{award.amount} points</p>
                    <p className="mt-1 font-semibold text-slate-700">{award.category}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600">
                    {formatDate(award.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {award.teacherName || "Teacher"} {award.note ? `- ${award.note}` : ""}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No awards yet" body="New point awards will appear here." />
        )}
      </section>
    </div>
  );
}

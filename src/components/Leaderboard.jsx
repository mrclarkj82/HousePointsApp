import { Trophy } from "lucide-react";
import { HOUSES, HOUSE_BY_ID, classNames, sortHousesByPoints } from "../utils/constants";

export default function Leaderboard({ houses = [], compact = false }) {
  const merged = HOUSES.map((base) => ({
    ...base,
    ...(houses.find((house) => house.id === base.id) || {}),
  }));
  const ranked = sortHousesByPoints(merged);
  const maxPoints = Math.max(1, ...ranked.map((house) => Number(house.totalPoints || 0)));

  return (
    <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
      {ranked.map((house, index) => {
        const meta = HOUSE_BY_ID[house.id] || house;
        const percent = Math.max(4, Math.round(((house.totalPoints || 0) / maxPoints) * 100));
        return (
          <article
            key={house.id}
            className={classNames(
              "rounded-lg border bg-white p-4 shadow-soft",
              meta.border,
              compact ? "" : "min-h-44"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-slate-500">Rank {index + 1}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{meta.name}</h3>
              </div>
              <div className={classNames("grid h-12 w-12 place-items-center rounded-lg text-white", meta.bg)}>
                <Trophy size={24} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-4xl font-black text-slate-950">{Number(house.totalPoints || 0).toLocaleString()}</p>
              <p className="pb-1 text-sm font-semibold text-slate-500">points</p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={classNames("h-full rounded-full", meta.bg)} style={{ width: `${percent}%` }} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

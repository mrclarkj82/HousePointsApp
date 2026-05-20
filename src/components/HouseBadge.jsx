import { HOUSE_BY_ID, classNames, getHouseName } from "../utils/constants";

export default function HouseBadge({ houseId, className = "" }) {
  const house = HOUSE_BY_ID[houseId];
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold",
        house ? `${house.softBg} ${house.text} ${house.border}` : "border-slate-200 bg-slate-100 text-slate-700",
        className
      )}
    >
      {getHouseName(houseId)}
    </span>
  );
}

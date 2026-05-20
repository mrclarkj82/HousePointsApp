import { HOUSE_BY_ID, classNames, getHouseName } from "../utils/constants";

export default function HouseBadge({ houseId, className = "" }) {
  const house = HOUSE_BY_ID[houseId];
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-black shadow-sm",
        house ? `${house.softBg} ${house.text} ${house.border}` : "border-amber-200 bg-amber-50 text-slate-700",
        className
      )}
    >
      {getHouseName(houseId)}
    </span>
  );
}

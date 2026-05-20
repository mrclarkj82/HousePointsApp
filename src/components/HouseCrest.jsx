import { Crown, Flame, Gem, HandHeart, Mountain, Shield } from "lucide-react";
import { HOUSE_BY_ID, classNames } from "../utils/constants";

const CREST_ICON = {
  verax: Gem,
  constantia: Mountain,
  comitas: HandHeart,
  fortitudo: Flame,
};

export default function HouseCrest({ houseId, size = "md", className = "" }) {
  const house = HOUSE_BY_ID[houseId];
  const Icon = CREST_ICON[houseId] || Shield;
  const dimensions = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-11 w-11" : "h-14 w-14";
  const iconSize = size === "lg" ? 34 : size === "sm" ? 20 : 26;

  return (
    <div
      className={classNames(
        "relative grid shrink-0 place-items-center rounded-lg border border-amber-200 bg-slate-950 text-white shadow-soft",
        dimensions,
        className
      )}
      style={{
        background: `linear-gradient(145deg, ${house?.hex || "#334155"}, #111827 72%)`,
      }}
    >
      <Shield className="absolute inset-0 m-auto h-[82%] w-[82%] text-white/10" strokeWidth={1.4} aria-hidden="true" />
      <Crown className="absolute top-1.5 h-3.5 w-3.5 text-amber-200" strokeWidth={2.6} aria-hidden="true" />
      <Icon size={iconSize} strokeWidth={2.4} aria-hidden="true" />
    </div>
  );
}

export const HOUSE_ORDER = ["verax", "constantia", "comitas", "fortitudo"];

export const HOUSES = [
  {
    id: "verax",
    name: "Verax",
    color: "red",
    bg: "bg-red-600",
    softBg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    hex: "#dc2626",
  },
  {
    id: "constantia",
    name: "Constantia",
    color: "blue",
    bg: "bg-blue-600",
    softBg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    hex: "#2563eb",
  },
  {
    id: "comitas",
    name: "Comitas",
    color: "emerald",
    bg: "bg-emerald-600",
    softBg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    hex: "#059669",
  },
  {
    id: "fortitudo",
    name: "Fortitudo",
    color: "amber",
    bg: "bg-amber-500",
    softBg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
    hex: "#d97706",
  },
];

export const HOUSE_BY_ID = Object.fromEntries(HOUSES.map((house) => [house.id, house]));

export const DEFAULT_CATEGORIES = [
  "Leadership",
  "Kindness",
  "Academic Excellence",
  "Service",
  "School Spirit",
  "Teamwork",
  "Responsibility",
  "Competition/Event",
  "Other",
];

export const DEFAULT_SEASONS = [
  "Quarter 1",
  "Quarter 2",
  "Quarter 3",
  "Quarter 4",
  "Semester 1",
  "Semester 2",
  "Full Year",
];

export const LEADERBOARD_FILTERS = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "semester", label: "Semester" },
  { id: "full_year", label: "Full Year" },
];

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function emailKey(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeHouseId(value) {
  const raw = slugify(value);
  if (HOUSE_BY_ID[raw]) return raw;
  const match = HOUSES.find((house) => slugify(house.name) === raw);
  return match?.id || raw;
}

export function getHouseName(houseId) {
  return HOUSE_BY_ID[houseId]?.name || houseId || "Unassigned";
}

export function formatDate(value) {
  if (!value) return "Pending";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "Pending";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getSchoolYearStart(now = new Date()) {
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 6, 1);
}

export function getDateRangeStart(filterId, now = new Date()) {
  const start = new Date(now);

  if (filterId === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (filterId === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (filterId === "quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1);
  }

  if (filterId === "semester") {
    return now.getMonth() < 6 ? new Date(now.getFullYear(), 0, 1) : new Date(now.getFullYear(), 6, 1);
  }

  return getSchoolYearStart(now);
}

export function getActiveSeasonId(seasons = []) {
  const active = seasons.find((season) => season.active);
  return active?.id || "full-year";
}

export function sortHousesByPoints(houses = []) {
  return [...houses].sort((a, b) => {
    const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
    if (pointsDiff !== 0) return pointsDiff;
    return HOUSE_ORDER.indexOf(a.id) - HOUSE_ORDER.indexOf(b.id);
  });
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

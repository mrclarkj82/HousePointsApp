import { Award, Castle, GraduationCap, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { logOut } from "../services/firebase";
import { classNames } from "../utils/constants";

const NAV_BY_ROLE = {
  student: [
    { to: "/student", label: "Student", icon: GraduationCap },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  teacher: [
    { to: "/teacher", label: "Award", icon: Award },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  admin: [
    { to: "/admin", label: "Admin", icon: ShieldCheck },
    { to: "/teacher", label: "Award", icon: Award },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
};

function NavButton({ item, mobile = false }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        classNames(
          "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition",
          mobile ? "min-h-14 flex-1 flex-col gap-1 px-2 py-2" : "min-h-12",
          isActive
            ? "bg-gradient-to-r from-red-800 to-amber-700 text-white shadow-sm"
            : "text-amber-50/80 active:bg-white/10"
        )
      }
    >
      <Icon size={mobile ? 20 : 18} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function AppShell({ profile, children }) {
  const location = useLocation();
  const navItems = NAV_BY_ROLE[profile?.role] || [];
  const title = navItems.find((item) => item.to === location.pathname)?.label || "House Points";

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-amber-200/30 bg-slate-950/94 text-white shadow-soft backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-amber-300/40 bg-gradient-to-br from-red-800 to-slate-900 text-amber-100">
              <Castle size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-normal text-amber-200">Doral Red Rock</p>
              <h1 className="truncate text-xl font-black text-white sm:text-2xl">{title}</h1>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavButton key={item.to} item={item} />
            ))}
          </nav>
          <button
            type="button"
            onClick={logOut}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-200/30 bg-white/10 px-3 text-amber-50 active:bg-white/15"
            aria-label="Sign out"
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-200/40 bg-slate-950/96 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur md:hidden">
        <div className="flex gap-2">
          {navItems.map((item) => (
            <NavButton key={item.to} item={item} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import LoadingScreen from "./components/LoadingScreen";
import { useAuthProfile } from "./hooks/useAuthProfile";
import AdminDashboard from "./pages/AdminDashboard";
import LeaderboardPage from "./pages/LeaderboardPage";
import LiveScoresPage from "./pages/LiveScoresPage";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import { logOut } from "./services/firebase";
import { ensureUserProfile, isBootstrapAdminEmail } from "./services/firestore";
import { useState } from "react";

function defaultPathForRole(role) {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/student";
}

function RoleRoute({ profile, allowed, children }) {
  if (!allowed.includes(profile.role)) {
    return <Navigate to={defaultPathForRole(profile.role)} replace />;
  }
  return children;
}

function PendingAccount({ user, profile }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const bootstrapAdmin = isBootstrapAdminEmail(user?.email || profile?.email);

  async function retrySetup() {
    if (!user) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await ensureUserProfile(user);
      setMessage("Setup refreshed. If the screen does not change, reload once.");
    } catch (retryError) {
      setError(retryError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-normal text-doral-red">Doral Red Rock</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          {bootstrapAdmin ? "Admin setup ready" : "Account waiting for setup"}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {profile?.email || user?.email || "This Google account"} is signed in, but it has not been imported as a student,
          teacher, or admin yet.
        </p>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          {bootstrapAdmin
            ? "This email is the bootstrap admin. Tap refresh setup to update the Firestore profile."
            : "Admins can import student and teacher CSV files, or add this email to the matching Firestore collection."}
        </div>
        {message ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button type="button" onClick={retrySetup} disabled={busy} className="btn-primary mt-6 w-full">
          {busy ? "Refreshing setup" : "Refresh setup"}
        </button>
        <button type="button" onClick={logOut} className="btn-secondary mt-3 w-full">
          Sign out
        </button>
      </section>
    </div>
  );
}

export default function App() {
  const { user, profile, loading, error } = useAuthProfile();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage error={error} />;
  if (!profile || profile.role === "pending") return <PendingAccount user={user} profile={profile} />;

  return (
    <AppShell profile={profile}>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPathForRole(profile.role)} replace />} />
        <Route
          path="/student"
          element={
            <RoleRoute profile={profile} allowed={["student", "admin"]}>
              <StudentDashboard profile={profile} />
            </RoleRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <RoleRoute profile={profile} allowed={["teacher", "admin"]}>
              <TeacherDashboard profile={profile} />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute profile={profile} allowed={["admin"]}>
              <AdminDashboard profile={profile} />
            </RoleRoute>
          }
        />
        <Route
          path="/live-scores"
          element={
            <RoleRoute profile={profile} allowed={["teacher", "admin"]}>
              <LiveScoresPage profile={profile} />
            </RoleRoute>
          }
        />
        <Route
          path="/live-scores/display"
          element={
            <RoleRoute profile={profile} allowed={["teacher", "admin"]}>
              <LiveScoresPage profile={profile} displayMode />
            </RoleRoute>
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage profile={profile} />} />
        <Route path="*" element={<Navigate to={defaultPathForRole(profile.role)} replace />} />
      </Routes>
    </AppShell>
  );
}

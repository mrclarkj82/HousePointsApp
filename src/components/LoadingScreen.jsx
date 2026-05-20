export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-lg bg-doral-red" />
        <p className="mt-4 text-lg font-bold text-slate-950">Loading house points</p>
      </div>
    </div>
  );
}

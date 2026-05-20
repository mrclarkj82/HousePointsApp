export default function EmptyState({ title, body }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      {body ? <p className="mt-1 text-sm text-slate-600">{body}</p> : null}
    </div>
  );
}

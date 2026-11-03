// Friendly "nothing here yet" panel: an icon, one sentence, one hint,
// and optionally the obvious next action.
export default function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
      {Icon && (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon size={32} />
        </span>
      )}
      <h3 className="mt-4 text-xl font-black text-ink">{title}</h3>
      {hint && (
        <p className="mt-2 max-w-sm text-base text-ink-muted">{hint}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

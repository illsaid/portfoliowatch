export function DiffDisplay({
  fieldPath,
  oldValue,
  newValue,
}: {
  fieldPath: string;
  oldValue: string | null;
  newValue: string | null;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-2 text-xs">
      <div className="mb-1 font-mono text-neutral-400">{fieldPath}</div>
      <div className="flex items-center gap-2">
        <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through">
          {oldValue || '(empty)'}
        </span>
        <span className="text-neutral-400">&rarr;</span>
        <span className="rounded bg-teal-50 px-1.5 py-0.5 text-teal-700">
          {newValue || '(empty)'}
        </span>
      </div>
    </div>
  );
}

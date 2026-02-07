import { formatDistanceToNow } from 'date-fns';

export function CheckInDisplay({
  lastPollAt,
  nextCheckInAt,
}: {
  lastPollAt: string | null;
  nextCheckInAt: string | null;
}) {
  const lastCheck = lastPollAt
    ? formatDistanceToNow(new Date(lastPollAt), { addSuffix: true })
    : 'never';

  const nextCheck = nextCheckInAt
    ? formatDistanceToNow(new Date(nextCheckInAt), { addSuffix: true })
    : 'not scheduled';

  return (
    <div className="flex flex-col gap-0.5 text-xs text-neutral-500">
      <span>
        Last check: <span className="font-medium text-neutral-700">{lastCheck}</span>
      </span>
      <span>
        Next check: <span className="font-medium text-neutral-700">{nextCheck}</span>
      </span>
    </div>
  );
}

import { Card, CardContent } from '@/components/ui/card';
import { Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="mx-auto max-w-md border-neutral-200">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
            <Shield className="h-7 w-7 text-teal-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-neutral-900">
              No checks yet
            </h2>
            <p className="text-sm leading-relaxed text-neutral-500">
              Add your biotech holdings to the watchlist and run your first poll.
              Portfolio Watchman will monitor SEC filings, clinical trials, and
              market moves so you don&apos;t have to.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Go to Admin
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-xs text-neutral-400">
            Add a ticker, then hit &ldquo;Poll Now&rdquo; in the Poll Runs tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { CardShell, CardTitle } from '@/components/card-shell';
import { StateBadge } from '@/components/state-badge';
import {
  Shield,
  Eye,
  Search,
  AlertTriangle,
  FileText,
  FlaskConical,
  TrendingDown,
  CheckCircle,
  ArrowRight,
  Settings,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'How it Works - Portfolio Watchman',
  description: 'Learn how Portfolio Watchman monitors your biotech holdings',
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <section className="text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-teal-50 flex items-center justify-center">
            <Shield className="h-8 w-8 text-teal-600" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-neutral-900 mb-4">
          How Portfolio Watchman Works
        </h1>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Portfolio Watchman runs check-ins against SEC filings, ClinicalTrials.gov, and market
          moves — then collapses everything into a daily state so you stay calm until something
          actually matters.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
            1
          </span>
          The 4-State Model
        </h2>
        <p className="text-sm text-neutral-600 mb-4">
          Every day, your portfolio is in one of four states. Each state tells you exactly how much
          attention is needed.
        </p>
        <div className="grid gap-4">
          <StateRow
            state="Contained"
            meaning="No high-signal changes detected."
            action="No action needed. Check back tomorrow."
          />
          <StateRow
            state="Watch"
            meaning="A change occurred, but it's likely low materiality or unconfirmed."
            action="Monitor for follow-up. No immediate action required."
          />
          <StateRow
            state="Look"
            meaning="A detection crossed your alert threshold."
            action="Review the 60-second brief. Decide if action is needed."
          />
          <StateRow
            state="Pause"
            meaning="A severe event or market gap hit panic sensitivity."
            action="Open triage immediately. This needs your attention now."
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
            2
          </span>
          What is a Detection?
        </h2>
        <CardShell>
          <p className="text-sm text-neutral-600 mb-4">
            A detection is a specific, provable change that the system identified during a check-in.
            Each detection is scored and may be suppressed into the Quiet Log if it&apos;s
            low-signal noise.
          </p>
          <div className="space-y-3">
            <DetectionExample
              icon={FileText}
              source="SEC EDGAR"
              example="New 8-K filing, 10-Q amendment, insider form"
            />
            <DetectionExample
              icon={FlaskConical}
              source="ClinicalTrials.gov"
              example="Trial status change, completion date moved, enrollment updated"
            />
            <DetectionExample
              icon={TrendingDown}
              source="Market Data"
              example="Price gap exceeding threshold, unusual volume"
            />
          </div>
        </CardShell>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
            3
          </span>
          Scoring & Suppression
        </h2>
        <CardShell>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-800 mb-1">Deterministic Scoring</h3>
              <p className="text-sm text-neutral-600">
                Each detection receives a score based on the change type, source tier, your holding
                dependency, and how close you are to a catalyst date. High scores escalate the daily
                state.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-800 mb-1">AI Interpretation</h3>
              <p className="text-sm text-neutral-600">
                For certain CT.gov changes (status, completion dates, enrollment), an AI model
                provides a &quot;why it matters&quot; interpretation. This is optional, cached, and
                rate-limited to control costs.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-800 mb-1">Suppression</h3>
              <p className="text-sm text-neutral-600">
                Low-signal detections (routine filings, minor date shifts) are automatically
                suppressed based on your Suppression Strictness setting. They still appear in the
                Quiet Log for audit purposes.
              </p>
            </div>
          </div>
        </CardShell>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
            4
          </span>
          The 60-Second Brief
        </h2>
        <CardShell>
          <p className="text-sm text-neutral-600 mb-4">
            When the state escalates above Contained, a brief is generated highlighting the top
            detection. The brief includes:
          </p>
          <ul className="space-y-2">
            <BriefItem text="What changed — the specific detection that triggered escalation" />
            <BriefItem text="Why it might matter — AI interpretation if available" />
            <BriefItem text="Score breakdown — raw and final scores, policy matches" />
            <BriefItem text="Next steps — recommended actions based on severity" />
          </ul>
        </CardShell>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
            5
          </span>
          Risk Controls
        </h2>
        <CardShell>
          <div className="space-y-4">
            <ControlItem
              name="Alert Threshold"
              description="The minimum score required to trigger a Look state. Higher values mean fewer alerts. Default: 60"
            />
            <ControlItem
              name="Suppression Strictness"
              description="How aggressively to hide low-value noise. Options: low (show more), med (balanced), high (hide more). Default: high"
            />
            <ControlItem
              name="Panic Sensitivity"
              description="The market gap percentage that triggers an immediate Pause state. Default: -20%"
            />
          </div>
        </CardShell>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-neutral-400" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <FAQItem
            question="Why do I see nothing yet?"
            answer="You need to add tickers to your watchlist and run at least one check-in. Go to Admin → Watchlist to add tickers, then Admin → Poll Runs to trigger a check-in."
          />
          <FAQItem
            question="Can it miss something?"
            answer="Portfolio Watchman monitors specific public sources (SEC EDGAR, ClinicalTrials.gov, market data). It will catch changes in those sources but won't detect private communications, rumors, or sources not in its coverage. Always combine with your own due diligence."
          />
          <FAQItem
            question="Does the AI invent facts?"
            answer="No. The AI interpretation is strictly constrained to the evidence provided (the diff and trial metadata). It cannot access external information. If information is missing, it will say so. The interpretation is clearly labeled and always shown alongside the raw evidence."
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600">
            6
          </span>
          Getting Started
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StepCard
            step={1}
            title="Add tickers"
            description="Go to Admin → Watchlist and add your biotech holdings with their SEC CIK numbers."
          />
          <StepCard
            step={2}
            title="Map trials (optional)"
            description="In Admin → Trials, link specific NCT IDs to your tickers for CT.gov monitoring."
          />
          <StepCard
            step={3}
            title="Run a check-in"
            description="Go to Admin → Poll Runs and click 'Poll Now' to trigger your first check-in."
          />
          <StepCard
            step={4}
            title="Tune the noise"
            description="Use the Quiet Log to see what's being suppressed and adjust Risk Controls as needed."
          />
        </div>
      </section>

      <section className="py-8 border-t border-neutral-200">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <Settings className="h-4 w-4" />
            Go to Watchlist
          </Link>
          <Link
            href="/quiet"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            View Quiet Log
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StateRow({
  state,
  meaning,
  action,
}: {
  state: 'Contained' | 'Watch' | 'Look' | 'Pause';
  meaning: string;
  action: string;
}) {
  return (
    <CardShell padding="sm" className="flex items-start gap-4">
      <StateBadge state={state} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700">{meaning}</p>
        <p className="text-xs text-neutral-500 mt-1">{action}</p>
      </div>
    </CardShell>
  );
}

function DetectionExample({
  icon: Icon,
  source,
  example,
}: {
  icon: React.ElementType;
  source: string;
  example: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-neutral-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-800">{source}</p>
        <p className="text-xs text-neutral-500">{example}</p>
      </div>
    </div>
  );
}

function BriefItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-neutral-600">
      <CheckCircle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
      {text}
    </li>
  );
}

function ControlItem({ name, description }: { name: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-800">{name}</h3>
      <p className="text-sm text-neutral-600 mt-0.5">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <CardShell padding="sm">
      <h3 className="text-sm font-medium text-neutral-800 mb-1">{question}</h3>
      <p className="text-sm text-neutral-600">{answer}</p>
    </CardShell>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <CardShell padding="sm">
      <div className="flex items-start gap-3">
        <span className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-medium text-neutral-800">{title}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        </div>
      </div>
    </CardShell>
  );
}

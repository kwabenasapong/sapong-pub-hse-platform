import { BookStatus, WorkflowStatus, SizeCategory, Translation } from "@prisma/client";

// ── Status Badge ──────────────────────────────────────────────────────────────
const BOOK_STATUS_STYLES: Record<BookStatus, string> = {
  NOT_STARTED: "bg-stone-100 text-stone-500 border border-stone-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  COMPLETE: "bg-green-50 text-green-700 border border-green-200",
};
const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

export function BookStatusBadge({ status }: { status: BookStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${BOOK_STATUS_STYLES[status]}`}>
      {BOOK_STATUS_LABELS[status]}
    </span>
  );
}

// ── Workflow Status Badge ─────────────────────────────────────────────────────
const WF_STYLES: Record<WorkflowStatus, string> = {
  PENDING: "bg-stone-100 text-stone-400",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
};

export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${WF_STYLES[status]}`}>
      {status === "APPROVED" && <span className="text-green-500">✓</span>}
      {status === "IN_PROGRESS" && <span className="text-amber-500">●</span>}
      {status === "PENDING" && <span className="text-stone-300">○</span>}
      {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}

// ── Translation Badge ─────────────────────────────────────────────────────────
const TRANS_STYLES: Record<Translation, string> = {
  KJV: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  PASSION: "bg-rose-50 text-rose-700 border border-rose-200",
  NLT: "bg-teal-50 text-teal-700 border border-teal-200",
};

export function TranslationBadge({ translation }: { translation: Translation }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${TRANS_STYLES[translation]}`}>
      {translation}
    </span>
  );
}

// ── Size Category Badge ───────────────────────────────────────────────────────
export function SizeBadge({ size }: { size: SizeCategory }) {
  const labels: Record<SizeCategory, string> = {
    FULL: "Full",
    MEDIUM_FULL: "Med-Full",
    MEDIUM: "Medium",
    SHORT: "Short",
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-600">
      {labels[size]}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-3xl font-semibold text-stone-800">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-800">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Workflow Step Tracker ─────────────────────────────────────────────────────
const STEP_NAMES = ["Intake", "Analysis", "Outline", "Drafts", "Matter"];

export function WorkflowTracker({
  steps,
}: {
  steps: Array<{ stepNumber: number; status: WorkflowStatus }>;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {STEP_NAMES.map((name, i) => {
        const step = steps.find((s) => s.stepNumber === i + 1);
        const status = step?.status ?? "PENDING";
        return (
          <div key={i} className="flex items-center gap-0.5" title={`Step ${i + 1}: ${name}`}>
            <div
              className={`w-5 h-2 rounded-sm ${
                status === "APPROVED"
                  ? "bg-green-400"
                  : status === "IN_PROGRESS"
                  ? "bg-amber-400"
                  : "bg-stone-200"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded transition-colors disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-amber-500 text-stone-900 hover:bg-amber-400",
    secondary: "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200",
    ghost: "text-stone-500 hover:text-stone-800 hover:bg-stone-100",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

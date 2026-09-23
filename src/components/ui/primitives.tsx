"use client";

import { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { color as colorOf } from "@/lib/meta";
import type { Urgency } from "@/lib/date";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-strong shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(0_0_0/0.15)]",
  secondary: "bg-surface text-fg border border-line hover:border-line-strong hover:bg-surface-2 shadow-soft",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  subtle: "bg-surface-2 text-fg hover:bg-surface-3",
  danger: "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10",
};
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-sm gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-[10px]",
  "icon-sm": "h-7 w-7 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
const FIELD =
  "w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-fg placeholder:text-subtle transition-[border-color,box-shadow] outline-none hover:border-line-strong focus:border-accent/60 focus:shadow-[0_0_0_3px_var(--ring)]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(FIELD, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(FIELD, "min-h-[84px] resize-y py-2 leading-relaxed", className)} {...props} />;
  },
);

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2397958f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, style, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(FIELD, "h-9 appearance-none bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8", className)}
      style={{ backgroundImage: CHEVRON, ...style }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-subtle">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Checkbox — round, satisfying completion
// ---------------------------------------------------------------------------
export function CheckCircle({
  checked,
  onChange,
  size = "md",
  className,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Mark as not done" : "Mark as done")}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange();
      }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-[1.5px] transition-all duration-200",
        size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4",
        checked
          ? "animate-pop border-accent bg-accent text-accent-fg"
          : "border-line-strong text-transparent hover:border-accent hover:text-accent/60",
        className,
      )}
    >
      <Check className={cn(size === "md" ? "h-3 w-3" : "h-2.5 w-2.5")} strokeWidth={3} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Badges & pills
// ---------------------------------------------------------------------------
export function Badge({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-surface-2 px-1.5 text-[11px] font-medium whitespace-nowrap text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", className)} />;
}

export function ColorBadge({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  const c = colorOf(color);
  return (
    <Badge className={cn(c.soft, c.text, className)}>
      <Dot className={c.dot} />
      {children}
    </Badge>
  );
}

const PRIORITY_BARS: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
export function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
  const level = PRIORITY_BARS[priority] ?? 2;
  if (priority === "urgent")
    return (
      <span
        title="Urgent"
        className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-rose-500 text-[10px] font-bold text-white", className)}
      >
        !
      </span>
    );
  return (
    <span
      title={`${priority[0].toUpperCase()}${priority.slice(1)} priority`}
      className={cn("inline-flex h-4 w-4 shrink-0 items-end justify-center gap-[2px] pb-[2px]", className)}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-[1px]", i <= level ? "bg-muted" : "bg-line-strong")}
          style={{ height: 3 + i * 3 }}
        />
      ))}
    </span>
  );
}

const URGENCY: Record<Urgency, { label: string; className: string; dot: string }> = {
  overdue: { label: "Overdue", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  today: { label: "Due today", className: "bg-orange-500/10 text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  soon: { label: "Soon", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  upcoming: { label: "Upcoming", className: "bg-surface-2 text-muted", dot: "bg-sky-500" },
  later: { label: "Later", className: "bg-surface-2 text-subtle", dot: "bg-zinc-400" },
};
export function UrgencyBadge({ urgency, label }: { urgency: Urgency; label?: string }) {
  const u = URGENCY[urgency];
  return (
    <Badge className={u.className}>
      <Dot className={u.dot} />
      {label ?? u.label}
    </Badge>
  );
}
export const URGENCY_META = URGENCY;

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface shadow-soft", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  icon,
  action,
  count,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-12 items-center justify-between gap-3 px-4 pt-3 pb-1.5", className)}>
      <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold tracking-tight text-fg">
        {icon && <span className="text-subtle [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
        {title}
        {count !== undefined && <span className="tabular text-xs font-medium text-subtle">{count}</span>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full bg-accent transition-[width] duration-700 ease-out", barClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 40,
  stroke = 4,
  className,
  trackClassName = "stroke-surface-3",
  barClassName = "stroke-accent",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className={cn("fill-none", trackClassName)} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.max(0, Math.min(100, value))) / 100}
          className={cn("fill-none transition-[stroke-dashoffset] duration-700 ease-out", barClassName)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-[10px] bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg font-medium whitespace-nowrap transition-all duration-150",
            size === "md" ? "h-8 px-3 text-[13px]" : "h-7 px-2.5 text-xs",
            value === o.value ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-all duration-150 [&_svg]:h-3.5 [&_svg]:w-3.5",
        active
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-sans text-[10px] font-medium text-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

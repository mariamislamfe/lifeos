"use client";

import { cn } from "@/lib/utils";

export function Page({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn("animate-fade-up mx-auto w-full px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16", wide ? "max-w-[1400px]" : "max-w-6xl", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[28px]">
          {icon && <span className="text-subtle [&_svg]:h-6 [&_svg]:w-6">{icon}</span>}
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-16",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "relative grid place-items-center rounded-2xl bg-surface text-subtle shadow-card ring-1 ring-line [&_svg]:h-5 [&_svg]:w-5",
            compact ? "h-10 w-10" : "mb-1 h-12 w-12",
          )}
        >
          <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-accent/10 blur-xl" />
          {icon}
        </div>
      )}
      <div className={cn("font-medium tracking-tight", compact ? "text-sm" : "font-display text-2xl")}>{title}</div>
      {description && <p className={cn("max-w-sm text-muted", compact ? "text-xs" : "text-sm")}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

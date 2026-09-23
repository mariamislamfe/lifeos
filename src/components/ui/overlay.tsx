"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToasts, type ToastMessage } from "@/lib/toast";

// ---------------------------------------------------------------------------
// Modal — centred dialog on desktop, bottom sheet on mobile
// ---------------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  children,
  size = "md",
  className,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:p-6 sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label={label}>
      <div className="animate-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-black/60" onClick={onClose} />
      <div
        className={cn(
          "animate-slide-up sm:animate-scale-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-pop sm:max-h-[80vh] sm:rounded-2xl",
          widths[size],
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ title, subtitle, onClose, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted [&_svg]:h-4 [&_svg]:w-4">{icon}</div>}
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-tight">{title}</div>
          {subtitle && <div className="truncate text-xs text-subtle">{subtitle}</div>}
        </div>
      </div>
      <button onClick={onClose} className="-mr-1 grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Close">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu — lightweight dropdown
// ---------------------------------------------------------------------------
export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hint?: string;
}

export function Menu({
  trigger,
  items,
  align = "end",
  className,
  side = "bottom",
}: {
  trigger: (props: { onClick: (e: React.MouseEvent) => void; "aria-expanded": boolean }) => React.ReactNode;
  items: (MenuItem | "divider")[];
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({
        onClick: (e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((o) => !o);
        },
        "aria-expanded": open,
      })}
      {open && (
        <div
          className={cn(
            "animate-scale-in absolute z-40 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-pop",
            align === "end" ? "right-0" : "left-0",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) =>
            item === "divider" ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors [&_svg]:h-4 [&_svg]:w-4",
                  item.danger ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" : "text-fg hover:bg-surface-2",
                )}
              >
                {item.icon && <span className={item.danger ? "" : "text-subtle"}>{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-[11px] text-subtle">{item.hint}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toaster
// ---------------------------------------------------------------------------
export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(
    () =>
      subscribeToasts((t) => {
        setToasts((prev) => [...prev.slice(-3), t]);
        setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), t.action ? 6000 : 3500);
      }),
    [],
  );
  const dismiss = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-scale-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-pop"
        >
          {t.tone === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
          {t.tone === "error" && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">{t.title}</div>
            {t.description && <div className="mt-0.5 text-xs break-words text-muted">{t.description}</div>}
          </div>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 rounded-md px-2 py-0.5 text-[13px] font-semibold text-accent hover:bg-accent/10"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

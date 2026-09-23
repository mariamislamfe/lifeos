"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, ExternalLink, ImageOff, Plus, ShoppingBag } from "lucide-react";
import { cn, formatMoney, hostname } from "@/lib/utils";
import { useData } from "@/lib/store";
import { parseISODate } from "@/lib/date";
import { PRIORITY_RANK, WISH_STATUS_LABEL } from "@/lib/meta";
import type { WishStatus, WishlistItem } from "@/lib/types";
import { Badge, Button, Card, Chip, PriorityIcon } from "@/components/ui/primitives";
import { Menu } from "@/components/ui/overlay";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { useOpenFromQuery } from "@/components/items/item-rows";
import { useFileUrl } from "@/components/items/files";
import { useEditor } from "@/components/editor/editor-provider";

const STATUS_STYLE: Record<WishStatus, string> = {
  want: "bg-surface-2 text-muted",
  planning: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  saving: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  bought: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export default function WishlistPage() {
  useOpenFromQuery("purchase");
  const { data } = useData();
  const editor = useEditor();
  const [status, setStatus] = useState<WishStatus | "open">("open");

  const items = useMemo(
    () =>
      data.wishlist
        .filter((w) => (status === "open" ? w.status !== "bought" : w.status === status))
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.target_date ?? "9").localeCompare(b.target_date ?? "9")),
    [data.wishlist, status],
  );

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of data.wishlist) if (w.status !== "bought" && w.price) map.set(w.currency, (map.get(w.currency) ?? 0) + Number(w.price));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.wishlist]);
  const bought = data.wishlist.filter((w) => w.status === "bought").length;

  return (
    <Page wide>
      <PageHeader
        title="Wishlist"
        description="Things you want to buy — without having to remember them."
        actions={
          <Button variant="primary" size="sm" onClick={() => editor.open("purchase")}>
            <Plus /> Item
          </Button>
        }
      />

      <Card className="mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium text-muted">Estimated wishlist value</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {totals.length === 0 ? (
              <span className="text-3xl font-semibold tracking-tight text-subtle">—</span>
            ) : (
              totals.map(([cur, sum], i) => (
                <span key={cur} className={cn("tabular font-semibold tracking-tight", i === 0 ? "text-3xl" : "text-lg text-muted")}>
                  {formatMoney(sum, cur)}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs text-subtle">Items</div>
            <div className="tabular font-semibold">{data.wishlist.length - bought}</div>
          </div>
          <div>
            <div className="text-xs text-subtle">Saving for</div>
            <div className="tabular font-semibold">{data.wishlist.filter((w) => w.status === "saving").length}</div>
          </div>
          <div>
            <div className="text-xs text-subtle">Bought</div>
            <div className="tabular font-semibold">{bought}</div>
          </div>
        </div>
      </Card>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={status === "open"} onClick={() => setStatus("open")}>
          Open
        </Chip>
        {(Object.keys(WISH_STATUS_LABEL) as WishStatus[]).map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {WISH_STATUS_LABEL[s]}
          </Chip>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title={data.wishlist.length ? "Nothing here" : "Your wishlist is empty"}
          description={data.wishlist.length ? "Try another filter." : "Save things you want to buy so you stop keeping them in your head."}
          action={
            <Button variant="primary" onClick={() => editor.open("purchase")}>
              <Plus /> Add item
            </Button>
          }
        />
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((w) => (
            <WishCard key={w.id} w={w} />
          ))}
        </div>
      )}
    </Page>
  );
}

function WishCard({ w }: { w: WishlistItem }) {
  const { update } = useData();
  const editor = useEditor();
  const img = useFileUrl(w.image_url);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => editor.open("purchase", { id: w.id })}
      onKeyDown={(e) => e.key === "Enter" && editor.open("purchase", { id: w.id })}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={w.name} className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]", w.status === "bought" && "grayscale")} />
        ) : (
          <div className="grid h-full place-items-center text-subtle">
            {w.image_url ? <ImageOff className="h-5 w-5" /> : <ShoppingBag className="h-6 w-6 opacity-40" />}
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Menu
            align="start"
            trigger={(p) => (
              <button {...p}>
                <Badge className={cn("cursor-pointer backdrop-blur", STATUS_STYLE[w.status], "bg-surface/90")}>{WISH_STATUS_LABEL[w.status]}</Badge>
              </button>
            )}
            items={(Object.keys(WISH_STATUS_LABEL) as WishStatus[]).map((s) => ({ label: WISH_STATUS_LABEL[s], onSelect: () => update("wishlist", w.id, { status: s }) }))}
          />
        </div>
        {w.status !== "bought" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              update("wishlist", w.id, { status: "bought" });
            }}
            className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-surface/90 text-muted opacity-0 shadow-soft backdrop-blur transition-opacity group-hover:opacity-100 hover:text-emerald-600"
            title="Mark as bought"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("line-clamp-2 text-[14px] leading-snug font-medium", w.status === "bought" && "text-subtle line-through")}>{w.name}</div>
          <PriorityIcon priority={w.priority} className={cn(w.priority === "low" && "opacity-50")} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="tabular text-[15px] font-semibold">{w.price != null ? formatMoney(Number(w.price), w.currency) : <span className="text-sm font-normal text-subtle">No price</span>}</span>
          {w.url && (
            <a href={w.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-subtle hover:text-fg">
              {hostname(w.url)} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {(w.category || w.target_date) && (
          <div className="mt-1 text-xs text-subtle">
            {w.category}
            {w.category && w.target_date ? " · " : ""}
            {w.target_date && `by ${format(parseISODate(w.target_date), "MMM d")}`}
          </div>
        )}
      </div>
    </div>
  );
}

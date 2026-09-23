"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { getRepository } from "@/lib/db";
import { useData } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { Modal, ModalHeader } from "@/components/ui/overlay";

/** Resolves a stored path (or `storage:` URL) to something an <img> or <iframe> can load. */
export function useFileUrl(pathOrUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    if (/^(https?:|data:)/.test(pathOrUrl)) {
      setUrl(pathOrUrl);
      return;
    }
    const path = pathOrUrl.replace(/^storage:/, "");
    getRepository()
      .fileUrl(path)
      .then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [pathOrUrl]);
  return url;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadButton({
  entityType,
  entityId,
  accept,
  label = "Upload",
  variant = "secondary",
  onUploaded,
}: {
  entityType: string;
  entityId?: string | null;
  accept?: string;
  label?: string;
  variant?: "secondary" | "primary" | "subtle";
  onUploaded?: (a: Attachment) => void;
}) {
  const { create } = useData();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const maxBytes = getRepository().mode === "local" ? 3 * 1024 * 1024 : 25 * 1024 * 1024;

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxBytes) {
          toast("File too large", { tone: "error", description: `${file.name} is over ${formatSize(maxBytes)}.` });
          continue;
        }
        const { path } = await getRepository().upload(file, entityType);
        const a = await create("attachments", { entity_type: entityType, entity_id: entityId ?? null, name: file.name, path, mime: file.type, size: file.size });
        onUploaded?.(a);
      }
      toast("Uploaded", { tone: "success" });
    } catch (e) {
      toast("Upload failed", { tone: "error", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} {label}
      </Button>
      <input ref={input} type="file" multiple accept={accept} className="hidden" onChange={(e) => handle(e.target.files)} />
    </>
  );
}

export function FilePreview({ file, open, onClose, side }: { file: Attachment | null; open: boolean; onClose: () => void; side?: React.ReactNode }) {
  const url = useFileUrl(file?.path);
  const isImage = file?.mime?.startsWith("image/");
  const isPdf = file?.mime === "application/pdf";
  return (
    <Modal open={open} onClose={onClose} size="xl" label={file?.name}>
      {file && (
        <>
          <ModalHeader title={file.name} subtitle={formatSize(file.size)} onClose={onClose} icon={isImage ? <ImageIcon /> : <FileText />} />
          <div className={cn("grid min-h-0 flex-1 gap-4 px-5 pb-5", side && "lg:grid-cols-[1fr_320px]")}>
            <div className="min-h-[50vh] overflow-auto rounded-xl border border-line bg-surface-2">
              {!url ? (
                <div className="grid h-full min-h-[50vh] place-items-center text-sm text-subtle">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={file.name} className="mx-auto max-h-[70vh] object-contain" />
              ) : isPdf ? (
                <iframe src={url} title={file.name} className="h-[70vh] w-full" />
              ) : (
                <div className="grid h-full min-h-[50vh] place-items-center">
                  <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
                    Open file
                  </a>
                </div>
              )}
            </div>
            {side && <div className="min-w-0">{side}</div>}
          </div>
        </>
      )}
    </Modal>
  );
}

export function FileList({ files, onOpen }: { files: Attachment[]; onOpen: (f: Attachment) => void }) {
  const { remove } = useData();
  if (!files.length) return null;
  return (
    <div className="flex flex-col gap-1">
      {files.map((f) => {
        const Icon = f.mime?.startsWith("image/") ? ImageIcon : f.mime === "application/pdf" ? FileText : Paperclip;
        return (
          <div key={f.id} className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted group-hover:bg-surface">
              <Icon className="h-4 w-4" />
            </div>
            <button onClick={() => onOpen(f)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium">{f.name}</div>
              <div className="text-xs text-subtle">
                {formatSize(f.size)} · {new Date(f.created_at).toLocaleDateString()}
              </div>
            </button>
            <button
              onClick={async () => {
                await remove("attachments", f.id, { undo: false });
                getRepository().removeFile(f.path);
              }}
              className="text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
              aria-label="Delete file"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

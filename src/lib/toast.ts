export type ToastTone = "default" | "success" | "error";
export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

type Listener = (t: ToastMessage) => void;
const listeners = new Set<Listener>();
let counter = 0;

export function toast(title: string, opts: Partial<Omit<ToastMessage, "id" | "title">> = {}) {
  const msg: ToastMessage = { id: ++counter, title, tone: "default", ...opts };
  listeners.forEach((l) => l(msg));
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

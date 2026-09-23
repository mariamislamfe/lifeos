import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="font-display text-6xl italic">Lost?</div>
        <p className="mt-3 text-sm text-muted">That page doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

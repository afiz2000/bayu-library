import { useEffect } from "react";

interface NoticeProps {
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function Notice({ message, onDismiss, autoDismissMs = 6000 }: NoticeProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  return (
    <div className="mb-4 flex animate-slide-in items-center justify-between rounded-md border border-gold bg-gold-light/40 px-4 py-2 text-sm text-navy shadow-sm">
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

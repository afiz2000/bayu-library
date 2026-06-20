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
    <div className="mb-4 flex items-center justify-between rounded-md border border-gold bg-gold-light/40 px-4 py-2 text-sm text-navy">
      <span>{message}</span>
      <button onClick={onDismiss} className="text-navy/60 hover:text-navy" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

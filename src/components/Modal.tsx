interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-navy-dark/50 px-4">
      <div className="w-full max-w-lg animate-scale-in rounded-lg border-t-4 border-gold bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-navy/50 transition-colors hover:bg-navy/5 hover:text-navy"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

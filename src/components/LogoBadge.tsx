export default function LogoBadge({ size = 96 }: { size?: number }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full border-2 border-navy bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute top-[8%] left-1/2 -translate-x-1/2"
        width={size * 0.62}
        height={size * 0.31}
        viewBox="0 0 100 50"
      >
        <path d="M4,48 A46,46 0 0,1 96,48" fill="none" stroke="var(--color-gold)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="h-[46%] w-[46%] text-navy"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 5.5C2 5.5 6 4 12 5.5V18.5C6 17 2 18.5 2 18.5V5.5Z" />
        <path d="M22 5.5C22 5.5 18 4 12 5.5V18.5C18 17 22 18.5 22 18.5V5.5Z" />
        <path d="M12 5.5V9" stroke="var(--color-gold)" />
        <path d="M12 7.2C12 7.2 11 6.2 10 7.2" stroke="var(--color-gold)" />
      </svg>
    </div>
  );
}

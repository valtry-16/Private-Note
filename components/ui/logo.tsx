export function ZeroVaultLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield body */}
      <path
        d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z"
        className="fill-primary"
        opacity="0.15"
      />
      <path
        d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner shield highlight */}
      <path
        d="M32 10L14 19v11c0 11.52 7.68 22.08 18 25.2 10.32-3.12 18-13.68 18-25.2V19L32 10z"
        className="fill-primary"
        opacity="0.08"
      />
      {/* Lock body */}
      <rect
        x="23"
        y="28"
        width="18"
        height="14"
        rx="3"
        className="fill-primary"
        opacity="0.9"
      />
      {/* Lock shackle */}
      <path
        d="M26 28v-5a6 6 0 0 1 12 0v5"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Keyhole */}
      <circle cx="32" cy="34" r="2.5" className="fill-primary-foreground" />
      <path
        d="M32 36v3"
        className="stroke-primary-foreground"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

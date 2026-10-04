type IconProps = {
  className?: string;
};

const base = "h-5 w-5 shrink-0";

export function PlayIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function PauseIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" />
    </svg>
  );
}

export function PrevIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 5.5a1 1 0 0 1 2 0v4.2l7.3-4.9a1 1 0 0 1 1.7.76v12.88a1 1 0 0 1-1.7.76L9 15.3v4.2a1 1 0 0 1-2 0Z" />
    </svg>
  );
}

export function NextIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17 5.5a1 1 0 0 0-2 0v4.2L7.7 4.8A1 1 0 0 0 6 5.56v12.88a1 1 0 0 0 1.7.76L15 15.3v4.2a1 1 0 0 0 2 0Z" />
    </svg>
  );
}

export function ShuffleIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 4h3v3" />
      <path d="M17 17h3v3" />
      <path d="M4 20 20 4" />
      <path d="M4 4h3.2c1.2 0 2.3.6 3 1.6L14.4 15c.7 1 1.8 1.6 3 1.6H20" />
      <path d="M4 10h2.4c1.2 0 2.3.6 3 1.6l.9 1.3" />
    </svg>
  );
}

export function RepeatIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 2.5 20 5.5l-3 3" />
      <path d="M20 5.5H7.5A3.5 3.5 0 0 0 4 9v1.5" />
      <path d="M7 21.5 4 18.5l3-3" />
      <path d="M4 18.5h12.5a3.5 3.5 0 0 0 3.5-3.5V13.5" />
    </svg>
  );
}

export function RepeatOneIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 2.5 20 5.5l-3 3" />
      <path d="M20 5.5H7.5A3.5 3.5 0 0 0 4 9v1.5" />
      <path d="M7 21.5 4 18.5l3-3" />
      <path d="M4 18.5h12.5a3.5 3.5 0 0 0 3.5-3.5V13.5" />
      <path d="M11.4 10.8 13 10v5" strokeWidth="1.7" />
    </svg>
  );
}

export function VolumeIcon({ className = base, muted = false }: IconProps & { muted?: boolean }) {
  if (muted) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M11 5 6.5 9H3v6h3.5L11 19Z" fill="currentColor" />
        <path d="m16 9.5 5 5" />
        <path d="m21 9.5-5 5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 5 6.5 9H3v6h3.5L11 19Z" fill="currentColor" />
      <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
      <path d="M17.9 6.5a7.6 7.6 0 0 1 0 11" />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function PlusIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </svg>
  );
}

export function SunIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function NoteIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="17.5" r="3" />
      <circle cx="18" cy="15.5" r="3" />
      <path d="M10 17.5V6l11-2.5v11" />
    </svg>
  );
}

export function LinkIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7l-1.3 1.3" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" />
    </svg>
  );
}

export function UploadIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 15.5V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

export function CloseIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function QueueIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h11M4 12h11M4 17h7" />
      <circle cx="17.5" cy="16.5" r="2.5" />
      <path d="M20 16.5V7.5l-3 1" />
    </svg>
  );
}

export function SlidersIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 4v6M6 14v6" />
      <path d="M12 4v3M12 11v9" />
      <path d="M18 4v10M18 18v2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="9" r="2" />
      <circle cx="18" cy="16" r="2" />
    </svg>
  );
}

export function PaletteIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 2-.9 2-1.9 0-.5-.2-.9-.5-1.2-.3-.4-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h1.4A4.3 4.3 0 0 0 20.5 10C20.5 6.4 16.7 3.5 12 3.5Z" />
      <circle cx="7.8" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ExpandIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m14.5 4.5 5-1.5-1.5 5" />
      <path d="M18.5 5.5 12 12" />
      <path d="m9.5 19.5-5 1.5 1.5-5" />
      <path d="m5.5 18.5 6.5-6.5" />
    </svg>
  );
}
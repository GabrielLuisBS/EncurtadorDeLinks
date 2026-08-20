interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function LinkIcon({ size = 20, strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 15L15 9" />
      <path d="M10.5 6.5L12 5a4 4 0 015.66 5.66l-1.5 1.5" />
      <path d="M13.5 17.5L12 19a4 4 0 01-5.66-5.66l1.5-1.5" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 15, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 6H6.5A2.5 2.5 0 004 8.5v9A2.5 2.5 0 006.5 20h9a2.5 2.5 0 002.5-2.5V14" />
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
    </svg>
  );
}

export function ClickIcon({ size = 20, strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 4l3 15 2.5-5.5L17 11 6 4z" />
    </svg>
  );
}

export function CopyIcon({ size = 15, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0013.5 4H6.5A2.5 2.5 0 004 6.5v7A2.5 2.5 0 006.5 16H8" />
    </svg>
  );
}

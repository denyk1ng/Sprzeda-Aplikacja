import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function LogoMark(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Building(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M9 16h1.5M13.5 16H15" />
      <path d="M10 21v-3.5h4V21" />
    </svg>
  );
}

export function Users(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.3 2.5-6 6-6h.5" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M14.5 20c0-2.6 1.9-4.7 4.3-5.1" />
    </svg>
  );
}

export function TrendingUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 17 10 10.5l4 4 6.5-7.5" />
      <path d="M15 6.5h5.5V12" />
    </svg>
  );
}

export function Mail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m4 6.5 8 6 8-6" />
    </svg>
  );
}

export function Plus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function RefreshCw(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12a8 8 0 0 1 14-5.3L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-14 5.3L4 16" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}

export function Trash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 6.5h15" />
      <path d="M8.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v1.5" />
      <path d="M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" />
      <path d="M10.2 10.5v6M13.8 10.5v6" />
    </svg>
  );
}

export function Copy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M6 15H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 4h8a1.5 1.5 0 0 1 1.5 1.5V6" />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 5.5 7 6.5-7 6.5" />
    </svg>
  );
}

export function Sparkles(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 13.4 8l4.6 1.4-4.6 1.4L12 15.3 10.6 10.8 6 9.4l4.6-1.4Z" />
      <path d="M19 15.5 19.7 18l2.3.8-2.3.8-.7 2.4-.7-2.4-2.3-.8 2.3-.8Z" />
    </svg>
  );
}

export function Search(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m19.5 19.5-4.3-4.3" />
    </svg>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10.5v4M12 17.5v.1" />
    </svg>
  );
}

export function Briefcase(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="18" height="11.5" rx="1.5" />
      <path d="M8.5 8V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

export function Newspaper(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5.5" width="13" height="14" rx="1.5" />
      <path d="M16 9h4.5v8.5A1.5 1.5 0 0 1 19 19h-3" />
      <path d="M6.5 9h6M6.5 12h6M6.5 15h4" />
    </svg>
  );
}

export function DollarSign(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c0-1.8-2-3-4.5-3s-4.5 1.2-4.5 3 2 2.7 4.5 3.2 4.5 1.4 4.5 3.3-2 3-4.5 3-4.5-1.2-4.5-3" />
    </svg>
  );
}

export function UserSwitch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.3 2.5-6 6-6" />
      <path d="M15.5 6.5 18 4l2.5 2.5M18 4v6" />
      <path d="M20.5 15.5 18 18l-2.5-2.5M18 18v-6" />
    </svg>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export function Spinner(props: IconProps) {
  return (
    <svg {...base(props)} className={`animate-spin ${props.className ?? ""}`}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
    </svg>
  );
}

export function Phone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 4h3l1.5 4.5-2 1.5a11 11 0 0 0 5 5l1.5-2 4.5 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4 5.6 1.5 1.5 0 0 1 5.5 4Z" />
    </svg>
  );
}

export function Linkedin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M7.8 10v6.5M7.8 7.3v.1" />
      <path d="M11.5 16.5V10M11.5 12.5c0-1.4 1-2.5 2.5-2.5s2.3 1 2.3 2.7v3.8" />
    </svg>
  );
}

export function Calendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21.5s7-6.2 7-11.7a7 7 0 1 0-14 0c0 5.5 7 11.7 7 11.7Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </svg>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v18M8 21h8" />
      <path d="M6 6h12" />
      <path d="M3 10.5 6 5l3 5.5a3 3 0 0 1-6 0Z" />
      <path d="M15 10.5 18 5l3 5.5a3 3 0 0 1-6 0Z" />
    </svg>
  );
}

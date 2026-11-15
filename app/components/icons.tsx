"use client";

import { type ReactNode, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function BaseIcon({ children, className = "", ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="m5 9.5_v11.5h14V9.5" />
    </BaseIcon>
  );
}

export function MineIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v12" />
      <path d="M8 15h8" />
      <path d="M8 15l-2 4h4l-2-4" />
      <path d="M12 19v2" />
      <path d="M8 19v2" />
      <path d="M16 19v2" />
    </BaseIcon>
  );
}

export function GemIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 3h12l-1 4L12 13L5 7z" />
      <path d="M18 3v6" />
      <path d="M6 21v-6" />
    </BaseIcon>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </BaseIcon>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m10 13 4 4 4-4" />
      <path d="M14 11a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M11 14a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </BaseIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2 2" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </BaseIcon>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M13 2v6h6" />
      <path d="M13 16h6v4h-6" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M12 15V9" />
      <path d="M12 9H7.5a2.5 2.5 0 0 1 0-5A2.5 2.5 0 0 1 12 2.5" />
      <path d="M12 9h4.5a2.5 2.5 0 0 0 0-5A2.5 2.5 0 0 0 16.5 9" />
      <path d="M4.5 20.25a2.25 2.25 0 0 1 0-4.5" />
      <path d="M19.5 20.25a2.25 2.25 0 0 0 0-4.5" />
      <path d="M4.5 13.5h15" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15 15 5 5" />
    </BaseIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </BaseIcon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </BaseIcon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14" />
      <path d="m12 12 5 5-5 5" />
    </BaseIcon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </BaseIcon>
  );
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </BaseIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17.5 20a5.5 5.5 0 0 0-11 0" />
    </BaseIcon>
  );
}

export function DollarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9c-.8-1.4-2-2-3-2-2 0-3.5 1-4 2.5" />
    </BaseIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 6 8.12 18.12" />
      <path d="M14.29 5.15a4.78 4.78 0 0 0-3.17-3.17L4 12.56" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

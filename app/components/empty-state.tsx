"use client";

import { type JSX, type SVGProps } from "react";
import Link from "next/link";

type IconProps = SVGProps<SVGSVGElement>;

interface EmptyStateProps {
  icon: (props: IconProps) => JSX.Element;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: (props: IconProps) => JSX.Element;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/60 px-6 py-12 sm:px-10 sm:py-16">
      <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-800/10">
        <Icon className="h-6 w-6 text-navy-700" />
      </div>
      <h3 className="mb-1 max-w-xs text-lg font-semibold tracking-tight text-charcoal">{title}</h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
        >
          {actionLabel}
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
        </Link>
      )}
    </div>
  );
}

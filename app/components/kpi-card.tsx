"use client";

import type { JSX, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

interface KpiCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: (props: IconProps) => JSX.Element;
}

export function KpiCard({ label, value, subtitle, icon: Icon }: KpiCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-800/80">
        <Icon className="h-5 w-5 text-navy-700" />
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
    </div>
  );
}


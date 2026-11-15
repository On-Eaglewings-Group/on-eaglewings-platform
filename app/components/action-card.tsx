"use client";

import type { JSX, SVGProps } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "./icons";

type IconProps = SVGProps<SVGSVGElement>;

interface ActionCardProps {
  label: string;
  description: string;
  icon: (props: IconProps) => JSX.Element;
  href: string;
  tone?: "navy" | "grey";
}

export function ActionCard({ label, description, icon: Icon, href, tone = "navy" }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        tone === "navy"
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-border bg-white text-charcoal"
      }`}
    >
      <div
        className={`mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          tone === "navy" ? "bg-gold/25 text-gold" : "bg-workspace text-navy-700"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className={`text-sm font-semibold ${tone === "navy" ? "text-white" : "text-charcoal"}`}>{label}</p>
      <p className={`mt-1 text-xs leading-relaxed ${tone === "navy" ? "text-navy-300" : "text-muted"}`}>{description}</p>
      <span
        className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
          tone === "navy" ? "text-navy-300 group-hover:text-white" : "text-navy-600 group-hover:text-navy-900"
        }`}
      >
        Go to {label}
        <ArrowRightIcon className="h-3 w-3" />
      </span>
    </Link>
  );
}

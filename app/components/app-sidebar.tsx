"use client";

import { type ReactElement, type SVGProps, useState } from "react";
import Link from "next/link";
import {
  HomeIcon,
  MineIcon,
  GemIcon,
  ClipboardIcon,
  LinkIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  FileIcon,
  SettingsIcon,
  BriefcaseIcon,
  UserIcon,
  ChevronRightIcon,
} from "./icons";

type IconProps = SVGProps<SVGSVGElement>;

type IconComponent = (props: IconProps) => ReactElement;

interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/", icon: HomeIcon },
      { label: "Mines", href: "/mines", icon: MineIcon },
      { label: "Producers", href: "/producers", icon: UsersIcon },
      { label: "Mineral Opportunities", href: "/opportunities", icon: GemIcon },
      { label: "Buyer Requirements", href: "/buyer-requirements", icon: ClipboardIcon },
      { label: "Matching & Introductions", href: "/matching", icon: LinkIcon },
    ],
  },
  {
    label: "Business Development",
    items: [
      { label: "Contacts", href: "/contacts", icon: UsersIcon },
      { label: "Follow-ups", href: "/follow-ups", icon: ClockIcon },
      { label: "Meetings", href: "/meetings", icon: CalendarIcon },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Documents", href: "/documents", icon: FileIcon },
      { label: "Settings", href: "/settings", icon: SettingsIcon },
      { label: "Team", href: "/settings/team", icon: UserIcon },
    ],
  },
];

const SECTION_ICONS: Record<string, IconComponent> = {
  Workspace: BriefcaseIcon,
  "Business Development": UsersIcon,
  Management: SettingsIcon,
};

export function AppSidebar({
  currentPath,
  mobileOpen,
  onCloseMobile,
}: {
  currentPath: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "0": true,
    "1": true,
    "2": true,
  });

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 overflow-y-auto rounded-r-xl border-r border-border bg-navy-900 text-white shadow-lg transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center justify-between border-b border-border/20 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/20">
              <GemIcon className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight tracking-tight">On-Eaglewings</p>
              <p className="text-xs text-navy-300/80">Opportunity Hub</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy-300 hover:bg-navy-800/50 hover:text-white md:hidden"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1 px-3 pb-6">
          {NAV_SECTIONS.map((section, sectionIndex) => {
            const SectionIcon = SECTION_ICONS[section.label];

            return (
              <div key={section.label}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-navy-400 transition-colors hover:text-white"
                  onClick={() => toggleSection(sectionIndex)}
                  aria-expanded={expandedSections[sectionIndex] ?? true}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-800/50 text-navy-400">
                    {SectionIcon && <SectionIcon className="h-4 w-4" />}
                  </span>
                  {section.label}
                  <span
                    className={`ml-auto transition-transform duration-200 ${
                      expandedSections[sectionIndex] ? "rotate-90" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </span>
                </button>

                {expandedSections[sectionIndex] && (
                  <div className="mt-1 space-y-1 rounded-lg bg-navy-800/30 px-2">
                    {section.items.map((item) => {
                      const isActive =
                        currentPath === item.href ||
                        (item.href !== "/" && currentPath.startsWith(`${item.href}/`));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-navy-700/50 text-white"
                              : "text-navy-300 hover:bg-navy-700/30 hover:text-white"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border/20 p-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-navy-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800/50">
              <UserIcon className="h-4 w-4 text-navy-400" />
            </span>
            <span className="text-xs text-navy-400">Authenticated session</span>
          </div>
        </div>
      </aside>
    </>
  );
}


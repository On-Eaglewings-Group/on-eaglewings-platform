"use client";

import { SearchIcon, ChevronRightIcon, MenuIcon } from "./icons";
import { SignOutButton } from "@/app/components/sign-out-button";

interface AppTopbarProps {
  onMenuClick: () => void;
}

export function AppTopbar({ onMenuClick }: AppTopbarProps) {

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
      {/* Page context */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-workspace hover:text-charcoal md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold tracking-tight text-charcoal">
          Overview
        </h1>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Breadcrumb">
          <span className="text-xs font-medium text-muted">Business Development</span>
          <span className="text-border">
            <ChevronRightIcon className="h-3.5 w-3.5 text-muted" />
          </span>
          <span className="text-xs font-medium text-muted">Dashboard</span>
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search..."
            className="w-40 rounded-full border border-border bg-workspace py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-muted focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-800/20 sm:w-56"
            aria-label="Search"
          />
        </div>

        <SignOutButton compact />
      </div>
    </header>
  );
}

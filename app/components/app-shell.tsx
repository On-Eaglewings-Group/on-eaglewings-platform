"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/app/components/app-sidebar";
import { AppTopbar } from "@/app/components/app-topbar";
import { WorkspaceProvider, type WorkspaceRole } from "@/lib/auth/workspace-context";

interface AppShellProps {
  children: ReactNode;
  role: WorkspaceRole | null;
  userId: string | null;
  workspaceId: string | null;
}

export function AppShell({ children, role, userId, workspaceId }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <WorkspaceProvider role={role} userId={userId} workspaceId={workspaceId}>
      <div className="flex min-h-screen flex-col bg-workspace">
        <AppSidebar
          currentPath={pathname}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-h-0 flex-1 flex-col md:pl-72">
          <AppTopbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

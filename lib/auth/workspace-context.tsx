"use client";

import { createContext, useContext, type ReactNode } from "react";

export type WorkspaceRole = "owner" | "admin" | "manager" | "contributor" | "viewer";

interface WorkspaceContextValue {
  role: WorkspaceRole | null;
  userId: string | null;
  workspaceId: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  role: null,
  userId: null,
  workspaceId: null,
});

export function WorkspaceProvider({
  role,
  userId,
  workspaceId,
  children,
}: WorkspaceContextValue & { children: ReactNode }) {
  return (
    <WorkspaceContext value={{ role, userId, workspaceId }}>
      {children}
    </WorkspaceContext>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}

/** Returns true when the current user has at least one of the given roles. */
export function useHasRole(...roles: WorkspaceRole[]): boolean {
  const { role } = useContext(WorkspaceContext);
  return role !== null && roles.includes(role);
}


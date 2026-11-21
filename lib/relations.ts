export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function profileDisplayName(profiles: unknown, fallback = "Workspace member"): string {
  const row = firstRelation(
    profiles as { display_name?: string | null } | { display_name?: string | null }[] | null,
  );
  const name = row?.display_name?.trim();
  return name || fallback;
}

import { UserIcon } from "@/app/components/icons";

interface Member {
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  user_profiles: { display_name: string; avatar_path: string | null } | null;
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "owner": return "bg-gold/20 text-yellow-800";
    case "admin": return "bg-purple-100 text-purple-800";
    case "manager": return "bg-blue-100 text-blue-800";
    case "contributor": return "bg-teal-100 text-teal-800";
    default: return "bg-zinc-100 text-zinc-700";
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active": return "bg-green-100 text-green-800";
    case "suspended": return "bg-red-100 text-red-800";
    default: return "bg-zinc-100 text-zinc-700";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function MembersList({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted">No members found.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((m) => {
        const displayName = m.user_profiles?.display_name || "—";
        const isYou = m.user_id === currentUserId;

        return (
          <li key={m.user_id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-800/10">
                <UserIcon className="h-4 w-4 text-navy-700" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">
                  {displayName}
                  {isYou && (
                    <span className="ml-2 text-xs font-normal text-muted">(you)</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">Joined {formatDate(m.joined_at)}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(m.role)}`}
              >
                {m.role}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(m.status)}`}
              >
                {m.status}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}


-- Invitation system and user profile bootstrap.
-- Adds pending_invitations plus private implementation functions and public,
-- authenticated-only RPC entrypoints used by the application callback.
-- Does NOT alter any existing table, column, RLS policy, or trigger.

begin;

-- ---------------------------------------------------------------------------
-- Table: public.pending_invitations
-- Purpose: Stores an invitation keyed by the target Google email address so
--   that an owner/admin can invite a user before that user has ever signed in.
--   When the invitee completes their first (or any subsequent) Google OAuth
--   sign-in, the callback matches auth.users.email against this table and
--   automatically creates an active workspace_memberships row.
-- Backward compatibility: New table. No existing table is altered. Can be
--   rolled back by dropping the table and revoking privileges.
-- ---------------------------------------------------------------------------
create table if not exists public.pending_invitations (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.workspaces(id) on delete cascade,
  invited_email text        not null
    check (invited_email = lower(btrim(invited_email)) and invited_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role          text        not null
    check (role in ('admin', 'manager', 'contributor', 'viewer')),
  token         text        not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid        not null references public.user_profiles(user_id) on delete restrict,
  invited_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days',
  accepted_at   timestamptz
);

-- In case a table-level unique constraint was previously created, drop it cleanly.
alter table public.pending_invitations
  drop constraint if exists pending_invitations_workspace_id_invited_email_key;

-- Partial unique index: allows only ONE pending, unaccepted invitation per
-- workspace and email, but permits reinviting an email after its previous invitation was accepted.
create unique index if not exists pending_invitations_active_unique_idx
  on public.pending_invitations (workspace_id, invited_email)
  where accepted_at is null;

create index if not exists pending_invitations_workspace_idx
  on public.pending_invitations (workspace_id, expires_at)
  where accepted_at is null;

create index if not exists pending_invitations_email_idx
  on public.pending_invitations (invited_email)
  where accepted_at is null;

alter table public.pending_invitations enable row level security;

-- Owners and admins can list pending invitations for their workspace.
drop policy if exists pending_invitations_read_admin on public.pending_invitations;
create policy pending_invitations_read_admin on public.pending_invitations
  for select to authenticated
  using (private.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Owners and admins can create invitations. Only owners can invite admins.
drop policy if exists pending_invitations_insert_admin on public.pending_invitations;
create policy pending_invitations_insert_admin on public.pending_invitations
  for insert to authenticated
  with check (
    private.has_workspace_role(workspace_id, array['owner', 'admin'])
    and (role <> 'admin' or private.has_workspace_role(workspace_id, array['owner']))
    and invited_by = (select auth.uid())
  );

-- Owners and admins can revoke (delete) invitations.
drop policy if exists pending_invitations_delete_admin on public.pending_invitations;
create policy pending_invitations_delete_admin on public.pending_invitations
  for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner', 'admin']));

grant select, insert, delete on public.pending_invitations to authenticated;

-- ---------------------------------------------------------------------------
-- Function: private.create_user_profile_if_missing
-- Purpose: Creates a user_profiles row for the authenticated user on first
--   Google OAuth sign-in. The public.user_profiles table grants only
--   SELECT and UPDATE to authenticated, so an INSERT requires a
--   security-definer function in the private schema.
-- Safety: Verifies p_user_id = auth.uid() so a compromised session cannot
--   create profiles for other users. ON CONFLICT DO NOTHING makes it safe
--   to call on every sign-in without creating duplicates.
-- Backward compatibility: New function. Does not alter any existing object.
-- ---------------------------------------------------------------------------
create or replace function private.create_user_profile_if_missing(
  p_user_id      uuid,
  p_display_name text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  -- Enforce that callers can only create their own profile.
  if p_user_id is distinct from (select auth.uid()) then
    raise exception 'Profile may only be created for the authenticated user';
  end if;

  insert into public.user_profiles (user_id, display_name)
  values (p_user_id, coalesce(nullif(btrim(p_display_name), ''), ''))
  on conflict (user_id) do nothing;
end;
$function$;

revoke all on function private.create_user_profile_if_missing(uuid, text) from public, anon;
grant execute on function private.create_user_profile_if_missing(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Function: private.accept_pending_invitation
-- Purpose: Atomically accepts a pending invitation for the authenticated user.
--   Enforces verified email identity, protects existing roles (owners and admins
--   can never be overwritten or downgraded, active roles are retained, inactive
--   memberships can be safely reactivated), and stamps the invitation as accepted.
-- Returns: The workspace_id of the accepted invitation, or NULL if none found.
-- Safety: SECURITY DEFINER with set search_path = ''.
-- ---------------------------------------------------------------------------
create or replace function private.accept_pending_invitation(
  p_user_id uuid,
  p_email   text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_invite              public.pending_invitations%rowtype;
  v_actual_email        text;
  v_email_confirmed_at  timestamptz;
begin
  if p_user_id is null or p_email is null then
    return null;
  end if;

  -- 1. Verify the authenticated user's ID matches auth.uid()
  if p_user_id is distinct from (select auth.uid()) then
    raise exception 'Invitation may only be accepted by the authenticated user';
  end if;

  -- 2. Verify supplied email matches authenticated user's verified identity in auth.users
  select lower(btrim(email)), email_confirmed_at
  into v_actual_email, v_email_confirmed_at
  from auth.users
  where id = (select auth.uid());

  if v_actual_email is null or lower(btrim(p_email)) is distinct from v_actual_email then
    raise exception 'Provided email does not match authenticated user email';
  end if;

  -- 3. Require email to be confirmed
  if v_email_confirmed_at is null then
    raise exception 'User email address has not been confirmed';
  end if;

  -- 4. Find the most recent valid invitation for this email (concurrency safe)
  select * into v_invite
  from public.pending_invitations
  where lower(btrim(invited_email)) = v_actual_email
    and accepted_at is null
    and expires_at > now()
  order by invited_at desc
  limit 1
  for update skip locked;

  if not found then
    return null;
  end if;

  -- Ensure user profile exists before creating membership row
  insert into public.user_profiles (user_id, display_name)
  values (p_user_id, '')
  on conflict (user_id) do nothing;

  -- Create or reactivate the workspace membership with role preservation rules:
  --   a) Never overwrite an existing owner's role
  --   b) Never downgrade an existing administrator
  --   c) Do not overwrite an existing active membership's role
  --   d) Inactive memberships are safely reactivated with the invited role
  insert into public.workspace_memberships (workspace_id, user_id, role, status, joined_at)
  values (v_invite.workspace_id, p_user_id, v_invite.role, 'active', now())
  on conflict (workspace_id, user_id) do update
    set status = 'active',
        role = case
          -- Never overwrite an existing owner's role
          when public.workspace_memberships.role = 'owner' then 'owner'
          -- Never downgrade an existing administrator
          when public.workspace_memberships.role = 'admin' and excluded.role in ('manager', 'contributor', 'viewer') then 'admin'
          -- Do not overwrite an existing active membership's role
          when public.workspace_memberships.status = 'active' then public.workspace_memberships.role
          -- Allow eligible inactive membership to be reactivated with invited role
          else excluded.role
        end,
        joined_at = coalesce(public.workspace_memberships.joined_at, now());

  -- Stamp the invitation as accepted
  update public.pending_invitations
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.workspace_id;
end;
$function$;

revoke all on function private.accept_pending_invitation(uuid, text) from public, anon;
grant execute on function private.accept_pending_invitation(uuid, text) to authenticated;

-- The Data API exposes public, not private. These invoker wrappers expose only
-- the callback operations and derive the user ID from the authenticated JWT.
-- The private SECURITY DEFINER functions retain their identity and invitation
-- checks. No role or workspace ID is accepted from the caller.
create or replace function public.create_user_profile_if_missing(
  p_display_name text default ''
)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.create_user_profile_if_missing((select auth.uid()), p_display_name);
$function$;

revoke all on function public.create_user_profile_if_missing(text) from public, anon;
grant execute on function public.create_user_profile_if_missing(text) to authenticated;

create or replace function public.accept_pending_invitation(p_email text)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.accept_pending_invitation((select auth.uid()), p_email);
$function$;

revoke all on function public.accept_pending_invitation(text) from public, anon;
grant execute on function public.accept_pending_invitation(text) to authenticated;

commit;

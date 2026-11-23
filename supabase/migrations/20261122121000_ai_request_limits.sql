begin;

-- Store only minute-level request counts. Request content, prompts and model
-- responses are never written to this table.
create table public.ai_request_windows (
  workspace_id uuid not null,
  user_id uuid not null,
  window_started_at timestamptz not null,
  request_count smallint not null default 1 check (request_count between 1 and 13),
  primary key (workspace_id, user_id, window_started_at),
  foreign key (workspace_id, user_id)
    references public.workspace_memberships(workspace_id, user_id) on delete cascade
);

create index ai_request_windows_expiry_idx on public.ai_request_windows (window_started_at);
alter table public.ai_request_windows enable row level security;
revoke all on public.ai_request_windows from public, anon, authenticated;

create function public.consume_ai_request_quota(p_workspace_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  current_window timestamptz := date_trunc('minute', transaction_timestamp());
  current_count smallint;
begin
  if actor_id is null or not private.has_workspace_role(p_workspace_id) then
    raise exception 'Workspace access denied.' using errcode = '42501';
  end if;

  delete from public.ai_request_windows
  where window_started_at < clock_timestamp() - interval '1 day';

  insert into public.ai_request_windows (workspace_id, user_id, window_started_at, request_count)
  values (p_workspace_id, actor_id, current_window, 1)
  on conflict (workspace_id, user_id, window_started_at)
  do update set request_count = least(public.ai_request_windows.request_count + 1, 13)
  returning request_count into current_count;

  return current_count <= 12;
end;
$function$;

revoke all on function public.consume_ai_request_quota(uuid) from public, anon;
grant execute on function public.consume_ai_request_quota(uuid) to authenticated;

commit;

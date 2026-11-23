begin;

create or replace function public.delete_requirement_line_with_specifications(
  p_workspace_id uuid,
  p_requirement_id uuid,
  p_line_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  deleted_line_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required to delete a buyer requirement line.' using errcode = '42501';
  end if;

  if not private.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin', 'manager', 'contributor']
  ) then
    raise exception 'You do not have permission to edit buyer requirements.' using errcode = '42501';
  end if;

  perform 1
  from public.buyer_requirements as br
  where br.id = p_requirement_id
    and br.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception 'Buyer requirement was not found in this workspace.' using errcode = 'P0002';
  end if;

  perform 1
  from public.requirement_lines as rl
  where rl.id = p_line_id
    and rl.buyer_requirement_id = p_requirement_id
    and rl.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception 'Commodity line was not found in this requirement.' using errcode = 'P0002';
  end if;

  delete from public.requirement_specifications as rs
  where rs.workspace_id = p_workspace_id
    and rs.requirement_line_id = p_line_id;

  delete from public.requirement_lines as rl
  where rl.id = p_line_id
    and rl.buyer_requirement_id = p_requirement_id
    and rl.workspace_id = p_workspace_id;
  get diagnostics deleted_line_count = row_count;
  if deleted_line_count <> 1 then
    raise exception 'Commodity line could not be deleted.' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.delete_requirement_line_with_specifications(uuid, uuid, uuid)
  from public, anon, service_role;
grant execute on function public.delete_requirement_line_with_specifications(uuid, uuid, uuid)
  to authenticated;

create or replace function public.delete_buyer_requirement_record(
  p_workspace_id uuid,
  p_requirement_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  requirement_exists boolean;
begin
  if actor_id is null or not private.has_workspace_role(p_workspace_id, array['owner', 'admin']) then
    raise exception 'Only workspace owners and administrators can delete buyer requirements.' using errcode = '42501';
  end if;

  perform 1
  from public.buyer_requirements as br
  where br.id = p_requirement_id
    and br.workspace_id = p_workspace_id
  for update;
  requirement_exists := found;
  if not requirement_exists then
    raise exception 'Buyer requirement was not found in this workspace.' using errcode = 'P0002';
  end if;

  begin
    delete from public.requirement_specifications as rs
    where rs.workspace_id = p_workspace_id
      and rs.requirement_line_id in (
        select rl.id
        from public.requirement_lines as rl
        where rl.workspace_id = p_workspace_id
          and rl.buyer_requirement_id = p_requirement_id
      );
    delete from public.requirement_lines as rl
    where rl.workspace_id = p_workspace_id
      and rl.buyer_requirement_id = p_requirement_id;
    delete from public.buyer_requirements as br
    where br.workspace_id = p_workspace_id
      and br.id = p_requirement_id;
    return 'deleted';
  exception when foreign_key_violation then
    -- Roll back the attempted physical deletion before archiving and preserving linked evidence.
    update public.buyer_requirements as br
    set archived_at = pg_catalog.now(),
        updated_at = pg_catalog.now(),
        updated_by = actor_id
    where br.workspace_id = p_workspace_id
      and br.id = p_requirement_id;
    return 'archived';
  end;
end;
$function$;

revoke all on function public.delete_buyer_requirement_record(uuid, uuid) from public, anon;
grant execute on function public.delete_buyer_requirement_record(uuid, uuid) to authenticated;

commit;

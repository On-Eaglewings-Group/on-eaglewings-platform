-- On-Eaglewings: Row Level Security for private workspace-documents bucket
--
-- Restricts Supabase Storage access strictly to authenticated workspace members
-- using the workspaces/<workspace_id>/... path hierarchy and private.has_workspace_role().

begin;

-- 1. SELECT policy: require the exact corresponding documents row. The
--    documents table's own RLS policy applies inside this EXISTS query, so its
--    classification rules also govern Storage reads. The path checks guard the
--    UUID casts and require the stored path to match the requested object.
drop policy if exists workspace_documents_select_member on storage.objects;
create policy workspace_documents_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-documents'
  and case
    when name ~* '^workspaces/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    then exists (
      select 1
      from public.documents as d
      where d.workspace_id = split_part(storage.objects.name, '/', 2)::uuid
        and d.id = split_part(storage.objects.name, '/', 4)::uuid
        and d.storage_path = storage.objects.name
    )
    else false
  end
);

-- Storage DELETE is independent of public.documents RLS. This narrow helper
-- checks the real classification as its owner, while binding authorization to
-- auth.uid() and the workspace parsed from the object path. A missing document
-- row is allowed for manager cleanup after an authorized row deletion.
create or replace function private.can_delete_workspace_document_object(
  p_workspace_id uuid,
  p_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and (
      private.has_workspace_role(p_workspace_id, array['owner','admin'])
      or (
        private.has_workspace_role(p_workspace_id, array['manager'])
        and not exists (
          select 1
          from public.documents as d
          where d.workspace_id = p_workspace_id
            and d.id = p_document_id
            and d.classification = 'restricted'
        )
      )
    );
$function$;

revoke all on function private.can_delete_workspace_document_object(uuid, uuid) from public, anon;
grant execute on function private.can_delete_workspace_document_object(uuid, uuid) to authenticated;

-- 2. INSERT policy: Workspace editors (owner, admin, manager, contributor) can upload
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'workspace_documents_insert_editor'
  ) then
    create policy workspace_documents_insert_editor
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'workspace-documents'
      and (
        case
          when name ~* '^workspaces/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
          then private.has_workspace_role(
            split_part(name, '/', 2)::uuid,
            array['owner', 'admin', 'manager', 'contributor']
          )
          else false
        end
      )
    );
  end if;
end $$;

-- 3. Owners/admins may delete all classifications. Managers may delete
--    non-restricted objects and clean orphaned objects, but not remove a
--    restricted document's object while its row exists.
drop policy if exists workspace_documents_delete_manager on storage.objects;
create policy workspace_documents_delete_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-documents'
  and case
    when name ~* '^workspaces/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    then private.can_delete_workspace_document_object(
      split_part(storage.objects.name, '/', 2)::uuid,
      split_part(storage.objects.name, '/', 4)::uuid
    )
    else false
  end
);

commit;

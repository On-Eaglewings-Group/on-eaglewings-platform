-- On-Eaglewings: Row Level Security for private workspace-documents bucket
--
-- Restricts Supabase Storage access strictly to authenticated workspace members
-- using the workspaces/<workspace_id>/... path hierarchy and private.has_workspace_role().

begin;

-- 1. SELECT policy: Active workspace members can read and create signed URLs for their workspace
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'workspace_documents_select_member'
  ) then
    create policy workspace_documents_select_member
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'workspace-documents'
      and (
        case
          when name ~* '^workspaces/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
          then private.has_workspace_role(split_part(name, '/', 2)::uuid)
          else false
        end
      )
    );
  end if;
end $$;

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

-- 3. DELETE policy: Workspace managers (owner, admin, manager) can delete documents
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'workspace_documents_delete_manager'
  ) then
    create policy workspace_documents_delete_manager
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'workspace-documents'
      and (
        case
          when name ~* '^workspaces/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
          then private.has_workspace_role(
            split_part(name, '/', 2)::uuid,
            array['owner', 'admin', 'manager']
          )
          else false
        end
      )
    );
  end if;
end $$;

commit;

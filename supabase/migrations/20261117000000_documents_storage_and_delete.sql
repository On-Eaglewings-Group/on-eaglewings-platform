-- On-Eaglewings: document storage path and document deletion policy.
--
-- Additive schema change; it does not alter existing business rows. Reversible
-- by dropping the column and policy.
--
-- 1. storage_path records the Supabase Storage object path for each document
--    so uploads can be downloaded and deleted through the application.
-- 2. Workspace owners, admins and managers may delete documents in their own
--    workspace. RLS continues to scope every row to its workspace.

begin;

-- 1. Add storage_path column if it does not already exist
alter table public.documents
  add column if not exists storage_path text;

-- 2. Owners/admins may delete every classification. Managers may delete only
--    non-restricted documents. Replace a same-named policy so an older broad
--    expression cannot remain active.
drop policy if exists documents_delete_manager on public.documents;
create policy documents_delete_manager
on public.documents
for delete to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin'])
  or (
    classification <> 'restricted'
    and private.has_workspace_role(workspace_id, array['manager'])
  )
);

-- 3. Document the column
comment on column public.documents.storage_path is
  'Supabase Storage object path (within the workspace-documents bucket) for the uploaded file.';

commit;

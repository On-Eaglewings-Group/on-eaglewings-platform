-- On-Eaglewings: document storage path and document deletion policy.
--
-- Additive change: no existing table, column, data or policy is altered or
-- removed. Safe to run against production; reversible by dropping the column
-- and the policy.
--
-- 1. storage_path records the Supabase Storage object path for each document
--    so uploads can be downloaded and deleted through the application.
-- 2. Workspace owners, admins and managers may delete documents in their own
--    workspace. RLS continues to scope every row to its workspace.

begin;

-- 1. Add storage_path column if it does not already exist
alter table public.documents
  add column if not exists storage_path text;

-- 2. Create the delete policy idempotently via pg_policies check
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and policyname = 'documents_delete_manager'
  ) then
    create policy documents_delete_manager
    on public.documents
    for delete to authenticated
    using (
      private.has_workspace_role(workspace_id, array['owner','admin','manager'])
    );
  end if;
end $$;

-- 3. Document the column
comment on column public.documents.storage_path is
  'Supabase Storage object path (within the workspace-documents bucket) for the uploaded file.';

commit;

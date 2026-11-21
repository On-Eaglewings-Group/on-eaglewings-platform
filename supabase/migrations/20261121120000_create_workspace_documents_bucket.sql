-- Additive: create the private workspace-documents bucket when it is missing.
-- Existing buckets, objects and policies are left unchanged.
-- Apply this in Supabase before expecting document uploads to succeed.
-- It has not been executed against production by this change.

insert into storage.buckets (id, name, public, file_size_limit)
values ('workspace-documents', 'workspace-documents', false, 52428800)
on conflict (id) do nothing;
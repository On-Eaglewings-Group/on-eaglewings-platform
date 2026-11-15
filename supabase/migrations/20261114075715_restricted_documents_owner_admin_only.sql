-- Restricted document metadata and associations are limited to workspace owners/admins.
-- This migration changes policies only; it does not alter or remove business records.
begin;

drop policy documents_read_classified on public.documents;
create policy documents_read_classified on public.documents for select to authenticated
using (
  private.has_workspace_role(workspace_id)
  and (
    classification = 'internal'
    or (classification = 'confidential' and private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']))
    or (classification = 'restricted' and private.has_workspace_role(workspace_id, array['owner','admin']))
  )
);

drop policy documents_insert_editor on public.documents;
create policy documents_insert_editor on public.documents for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and (classification <> 'restricted' or private.has_workspace_role(workspace_id, array['owner','admin']))
);

drop policy documents_update_editor on public.documents;
create policy documents_update_editor on public.documents for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and (classification <> 'restricted' or private.has_workspace_role(workspace_id, array['owner','admin']))
)
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and (classification <> 'restricted' or private.has_workspace_role(workspace_id, array['owner','admin']))
);

-- Apply the classification check at the association row as well as at documents,
-- so a document link cannot reveal or mutate a restricted document association.
drop policy document_links_read_classified on public.document_links;
create policy document_links_read_classified on public.document_links for select to authenticated
using (
  private.has_workspace_role(workspace_id)
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
      and (d.classification <> 'restricted' or private.has_workspace_role(d.workspace_id, array['owner','admin']))
  )
);

drop policy document_links_insert_editor on public.document_links;
create policy document_links_insert_editor on public.document_links for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
      and (d.classification <> 'restricted' or private.has_workspace_role(d.workspace_id, array['owner','admin']))
  )
);

drop policy document_links_update_editor on public.document_links;
create policy document_links_update_editor on public.document_links for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
      and (d.classification <> 'restricted' or private.has_workspace_role(d.workspace_id, array['owner','admin']))
  )
)
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
      and (d.classification <> 'restricted' or private.has_workspace_role(d.workspace_id, array['owner','admin']))
  )
);

drop policy document_links_delete_manager on public.document_links;
create policy document_links_delete_manager on public.document_links for delete to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin','manager'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
      and (d.classification <> 'restricted' or private.has_workspace_role(d.workspace_id, array['owner','admin']))
  )
);

-- Audit rows can disclose document/link identifiers even when the base row is hidden.
-- Owners/admins retain full audit access; managers retain other audit access and only
-- see document/link audit rows while their related document is non-restricted.
drop policy audit_events_read_manager on public.audit_events;
create policy audit_events_read_manager on public.audit_events for select to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin'])
  or (
    private.has_workspace_role(workspace_id, array['manager'])
    and (
      entity_type not in ('documents','document_links')
      or (
        entity_type = 'documents'
        and exists (
          select 1 from public.documents d
          where d.workspace_id = audit_events.workspace_id
            and d.id = audit_events.record_id
            and d.classification <> 'restricted'
        )
      )
      or (
        entity_type = 'document_links'
        and exists (
          select 1
          from public.document_links dl
          join public.documents d
            on d.workspace_id = dl.workspace_id
           and d.id = dl.document_id
          where dl.workspace_id = audit_events.workspace_id
            and dl.id = audit_events.record_id
            and d.classification <> 'restricted'
        )
      )
    )
  )
);

commit;

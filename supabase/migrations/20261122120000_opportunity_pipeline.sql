begin;

-- Commercial progress is tracked separately from the opportunity's existing
-- qualification status. This keeps the two workflows distinct and preserves
-- all existing status data.
create table public.opportunity_pipeline (
  workspace_id uuid not null,
  mineral_opportunity_id uuid not null,
  stage text not null default 'new_opportunity'
    check (stage in (
      'new_opportunity', 'initial_assessment', 'qualification', 'buyer_matching',
      'buyer_engagement', 'negotiation', 'due_diligence', 'contract_agreement',
      'closed_won', 'closed_lost'
    )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  estimated_value numeric(24,2) check (estimated_value is null or estimated_value >= 0),
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  stage_entered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, mineral_opportunity_id),
  foreign key (workspace_id, mineral_opportunity_id)
    references public.mineral_opportunities(workspace_id, id) on delete restrict,
  check ((estimated_value is null) = (currency_code is null))
);

create index opportunity_pipeline_workspace_stage_idx
  on public.opportunity_pipeline (workspace_id, stage, updated_at desc);

create table public.opportunity_pipeline_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  mineral_opportunity_id uuid not null,
  previous_stage text check (previous_stage is null or previous_stage in (
    'new_opportunity', 'initial_assessment', 'qualification', 'buyer_matching',
    'buyer_engagement', 'negotiation', 'due_diligence', 'contract_agreement',
    'closed_won', 'closed_lost'
  )),
  new_stage text not null check (new_stage in (
    'new_opportunity', 'initial_assessment', 'qualification', 'buyer_matching',
    'buyer_engagement', 'negotiation', 'due_diligence', 'contract_agreement',
    'closed_won', 'closed_lost'
  )),
  action text not null check (action in ('created', 'stage_changed', 'details_updated')),
  note text check (note is null or length(note) <= 500),
  changed_by uuid references public.user_profiles(user_id) on delete set null,
  occurred_at timestamptz not null default now(),
  foreign key (workspace_id, mineral_opportunity_id)
    references public.mineral_opportunities(workspace_id, id) on delete restrict
);

create index opportunity_pipeline_events_record_idx
  on public.opportunity_pipeline_events (workspace_id, mineral_opportunity_id, occurred_at desc);

alter table public.opportunity_pipeline enable row level security;
alter table public.opportunity_pipeline_events enable row level security;

create policy opportunity_pipeline_read_member on public.opportunity_pipeline
  for select to authenticated using (private.has_workspace_role(workspace_id));
create policy opportunity_pipeline_insert_editor on public.opportunity_pipeline
  for insert to authenticated with check (
    private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  );
create policy opportunity_pipeline_update_editor on public.opportunity_pipeline
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']));

create policy opportunity_pipeline_events_read_member on public.opportunity_pipeline_events
  for select to authenticated using (private.has_workspace_role(workspace_id));
create policy opportunity_pipeline_events_insert_editor on public.opportunity_pipeline_events
  for insert to authenticated with check (
    private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  );

grant select, insert, update on public.opportunity_pipeline to authenticated;
grant select, insert on public.opportunity_pipeline_events to authenticated;

-- New opportunities enter the first commercial stage immediately. Legacy rows
-- remain unassigned until a workspace member reviews and stages them.
create function private.initialize_opportunity_pipeline()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  insert into public.opportunity_pipeline (
    workspace_id, mineral_opportunity_id, stage, created_by, updated_by
  ) values (
    new.workspace_id, new.id, 'new_opportunity', new.created_by, new.created_by
  );

  insert into public.opportunity_pipeline_events (
    workspace_id, mineral_opportunity_id, previous_stage, new_stage, action, note, changed_by
  ) values (
    new.workspace_id, new.id, null, 'new_opportunity', 'created',
    'Opportunity entered the commercial pipeline.', new.created_by
  );

  return new;
end;
$function$;

revoke all on function private.initialize_opportunity_pipeline() from public, anon, authenticated;
create trigger mineral_opportunity_initialize_pipeline
  after insert on public.mineral_opportunities
  for each row execute function private.initialize_opportunity_pipeline();

-- A single authenticated transaction updates the stage/details and appends the
-- corresponding event. The expected stage prevents stale cards overwriting a
-- concurrent change.
create function public.update_opportunity_pipeline(
  p_workspace_id uuid,
  p_mineral_opportunity_id uuid,
  p_expected_stage text,
  p_stage text,
  p_priority text,
  p_estimated_value numeric,
  p_currency_code text,
  p_note text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  current_stage text;
  pipeline_exists boolean;
  event_action text;
begin
  if (select auth.uid()) is null
     or not private.has_workspace_role(p_workspace_id, array['owner','admin','manager','contributor']) then
    raise exception 'You do not have permission to update this pipeline.' using errcode = '42501';
  end if;

  if p_stage not in (
    'new_opportunity', 'initial_assessment', 'qualification', 'buyer_matching',
    'buyer_engagement', 'negotiation', 'due_diligence', 'contract_agreement',
    'closed_won', 'closed_lost'
  ) then
    raise exception 'Invalid pipeline stage.' using errcode = '22023';
  end if;
  if p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid pipeline priority.' using errcode = '22023';
  end if;
  if p_estimated_value is not null and (p_estimated_value < 0 or p_currency_code !~ '^[A-Z]{3}$') then
    raise exception 'Enter a non-negative value and a three-letter currency.' using errcode = '22023';
  end if;
  if p_estimated_value is null and p_currency_code is not null then
    raise exception 'Currency requires an estimated value.' using errcode = '22023';
  end if;
  if p_note is not null and length(p_note) > 500 then
    raise exception 'Pipeline notes must be 500 characters or fewer.' using errcode = '22023';
  end if;

  select stage into current_stage
  from public.opportunity_pipeline
  where workspace_id = p_workspace_id
    and mineral_opportunity_id = p_mineral_opportunity_id
  for update;
  pipeline_exists := found;

  if pipeline_exists then
    if p_expected_stage is distinct from current_stage then
      raise exception 'This opportunity changed in another session. Refresh and try again.' using errcode = '40001';
    end if;
    if current_stage in ('closed_won', 'closed_lost')
       and current_stage is distinct from p_stage
       and nullif(btrim(p_note), '') is null then
      raise exception 'Add an activity note when reopening a closed opportunity.' using errcode = '22023';
    end if;
    update public.opportunity_pipeline
    set stage = p_stage,
        priority = p_priority,
        estimated_value = p_estimated_value,
        currency_code = p_currency_code,
        stage_entered_at = case when current_stage is distinct from p_stage then now() else stage_entered_at end,
        updated_by = (select auth.uid()),
        updated_at = now()
    where workspace_id = p_workspace_id
      and mineral_opportunity_id = p_mineral_opportunity_id;
    event_action := case when current_stage is distinct from p_stage then 'stage_changed' else 'details_updated' end;
  else
    if p_expected_stage <> '__unassigned__' then
      raise exception 'This opportunity changed in another session. Refresh and try again.' using errcode = '40001';
    end if;
    insert into public.opportunity_pipeline (
      workspace_id, mineral_opportunity_id, stage, priority, estimated_value,
      currency_code, created_by, updated_by
    ) values (
      p_workspace_id, p_mineral_opportunity_id, p_stage, p_priority, p_estimated_value,
      p_currency_code, (select auth.uid()), (select auth.uid())
    );
    current_stage := null;
    event_action := 'created';
  end if;

  insert into public.opportunity_pipeline_events (
    workspace_id, mineral_opportunity_id, previous_stage, new_stage, action, note, changed_by
  ) values (
    p_workspace_id, p_mineral_opportunity_id, current_stage, p_stage, event_action,
    nullif(btrim(p_note), ''), (select auth.uid())
  );
end;
$function$;

revoke all on function public.update_opportunity_pipeline(uuid, uuid, text, text, text, numeric, text, text) from public, anon;
grant execute on function public.update_opportunity_pipeline(uuid, uuid, text, text, text, numeric, text, text) to authenticated;

commit;

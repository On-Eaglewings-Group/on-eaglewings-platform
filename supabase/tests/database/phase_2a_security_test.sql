-- Run after migrations with `supabase test db` in a local Supabase stack.
-- Every fixture is inserted inside this transaction and rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;
select plan(118);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','phase2a-owner-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','phase2a-viewer-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000003','authenticated','authenticated','phase2a-contributor-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000004','authenticated','authenticated','phase2a-manager-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000005','authenticated','authenticated','phase2a-owner-b@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000006','authenticated','authenticated','phase2a-new@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000007','authenticated','authenticated','phase2a-expired@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000008','authenticated','authenticated','phase2a-outsider-b@example.invalid','',now(),'{}','{}',now(),now());

insert into public.user_profiles(user_id, display_name) values
 ('a1000000-0000-4000-8000-000000000001','Test owner A'),
 ('a1000000-0000-4000-8000-000000000002','Test viewer A'),
 ('a1000000-0000-4000-8000-000000000003','Test contributor A'),
 ('a1000000-0000-4000-8000-000000000004','Test manager A'),
 ('a1000000-0000-4000-8000-000000000005','Test owner B'),
 ('a1000000-0000-4000-8000-000000000008','Test outsider B');

insert into public.workspaces(id,name,slug) values
 ('b1000000-0000-4000-8000-000000000001','Test Workspace A','phase2a-test-a'),
 ('b1000000-0000-4000-8000-000000000002','Test Workspace B','phase2a-test-b');

insert into public.workspace_memberships(workspace_id,user_id,role,status) values
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','owner','active'),
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','viewer','active'),
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','contributor','active'),
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','manager','active'),
 ('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000005','owner','active'),
 ('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000008','contributor','active');

insert into public.organizations(id,workspace_id,legal_name,normalized_name) values
 ('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Fixture A','fixture a'),
 ('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Fixture B','fixture b');

insert into public.pending_invitations(workspace_id,invited_email,role,invited_by)
values ('b1000000-0000-4000-8000-000000000001','phase2a-new@example.invalid','contributor','a1000000-0000-4000-8000-000000000001');
insert into public.pending_invitations(workspace_id,invited_email,role,invited_by,expires_at)
values ('b1000000-0000-4000-8000-000000000001','phase2a-expired@example.invalid','viewer','a1000000-0000-4000-8000-000000000001',now()-interval '1 day');

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((select count(*)::int from public.organizations),1,'viewer reads only own workspace rows');
select is((select count(*)::int from public.organizations where id='c1000000-0000-4000-8000-000000000001'),1,'viewer sees own workspace organization');
select throws_ok($$insert into public.organizations(workspace_id,legal_name,normalized_name) values ('b1000000-0000-4000-8000-000000000001','Denied','denied')$$, '42501', null, 'viewer cannot insert');
with changed as (
  update public.organizations
  set legal_name='Denied'
  where id='c1000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*)::int from changed),0,'viewer cannot update');
with removed as (
  delete from public.organizations
  where id='c1000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*)::int from removed),0,'viewer cannot delete');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000006',true);
select lives_ok($$select public.create_user_profile_if_missing('New invitee')$$,'public profile RPC bootstraps a new authenticated user');
select is((select count(*)::int from public.user_profiles where user_id='a1000000-0000-4000-8000-000000000006'),1,'new user profile is created once');
select lives_ok($$select public.create_user_profile_if_missing('Changed name')$$,'profile RPC safely accepts an existing user profile');
select is((select display_name from public.user_profiles where user_id='a1000000-0000-4000-8000-000000000006'),'New invitee','existing profile bootstrap does not overwrite stored profile data');
select is(public.accept_pending_invitation('phase2a-new@example.invalid'),'b1000000-0000-4000-8000-000000000001'::uuid,'valid pending invitation is accepted through the public RPC');
select is((select role from public.workspace_memberships where workspace_id='b1000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000006'),'contributor','valid invitation creates the invited membership role');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.pending_invitations where invited_email='phase2a-new@example.invalid' and accepted_at is not null),1,'valid invitation is stamped accepted');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000007',true);
select throws_ok($$select public.accept_pending_invitation('other@example.invalid')$$,'P0001',null,'invitation RPC rejects an email that differs from the authenticated identity');
select is((select count(*)::int from public.workspace_memberships where user_id='a1000000-0000-4000-8000-000000000007'),0,'failed invitation acceptance creates no membership');
select is(public.accept_pending_invitation('phase2a-expired@example.invalid'),null::uuid,'expired invitation is not accepted');
select is((select count(*)::int from public.workspace_memberships where user_id='a1000000-0000-4000-8000-000000000007'),0,'expired invitation leaves the user without workspace membership');

select ok(has_function_privilege('authenticated','public.create_user_profile_if_missing(text)','EXECUTE'),'authenticated can execute the public profile RPC');
select ok(not has_function_privilege('anon','public.create_user_profile_if_missing(text)','EXECUTE'),'anon cannot execute the public profile RPC');
select ok(not has_function_privilege('anon','public.accept_pending_invitation(text)','EXECUTE'),'anon cannot execute the public invitation RPC');
select ok(has_function_privilege('authenticated','private.can_delete_workspace_document_object(uuid,uuid)','EXECUTE'),'authenticated can use the scoped Storage deletion check');
select ok(not has_function_privilege('anon','private.can_delete_workspace_document_object(uuid,uuid)','EXECUTE'),'anon cannot use the scoped Storage deletion check');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.create_user_profile_if_missing('Must not replace owner')$$,'existing authenticated profile bootstrap succeeds');
select is((select display_name from public.user_profiles where user_id='a1000000-0000-4000-8000-000000000001'),'Test owner A','existing profile contents remain unchanged');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select lives_ok($$insert into public.organizations(id,workspace_id,legal_name,normalized_name) values ('c1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','Contributor Write','contributor write')$$,'contributor can create workspace business record');
select is((select created_by from public.organizations where id='c1000000-0000-4000-8000-000000000003'),'a1000000-0000-4000-8000-000000000003'::uuid,'creator attribution is bound to authenticated actor');
select throws_ok($$update public.organizations set workspace_id='b1000000-0000-4000-8000-000000000002' where id='c1000000-0000-4000-8000-000000000001'$$,'P0001',null,'contributor cannot reassign workspace');
select throws_ok($$insert into public.workspace_memberships(workspace_id,user_id,role) values ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','admin')$$, '42501', null, 'contributor cannot grant administrative membership');
with changed as (
  update public.workspace_memberships
  set role='owner'
  where workspace_id='b1000000-0000-4000-8000-000000000001'
    and user_id='a1000000-0000-4000-8000-000000000003'
  returning 1
)
select is((select count(*)::int from changed),0,'contributor cannot promote self');
select throws_ok($$insert into public.organizations(workspace_id,legal_name,normalized_name,verification_status,verified_at,verified_by) values ('b1000000-0000-4000-8000-000000000001','Fake Verified','fake verified','verified',now(),'a1000000-0000-4000-8000-000000000003')$$, 'P0001', null, 'verified organization cannot bypass workflow');
select throws_ok($$insert into public.organization_verification_events(workspace_id,organization_id,new_status,method,checked_by) values ('b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','in_review','test','a1000000-0000-4000-8000-000000000003')$$,'42501',null,'contributor cannot create verification event');

select lives_ok($$insert into public.mineral_opportunities(id,workspace_id,title,source_organization_id,created_by) values ('e1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Test opportunity','c1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003')$$,'contributor can create opportunity');
select is((select stage from public.opportunity_pipeline where mineral_opportunity_id='e1000000-0000-4000-8000-000000000001'),'new_opportunity','new opportunities enter the first pipeline stage');
select lives_ok($$select public.update_opportunity_pipeline('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','new_opportunity','qualification','high',100,'USD','Specifications received')$$,'contributor can move opportunity and record pipeline details');
select is((select stage from public.opportunity_pipeline where mineral_opportunity_id='e1000000-0000-4000-8000-000000000001'),'qualification','pipeline stage change persists');
select lives_ok($$select public.update_opportunity_pipeline('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','qualification','closed_won','high',100,'USD','Agreement executed')$$,'contributor can close an opportunity with an audit note');
select is((select count(*)::int from public.opportunity_pipeline_events where mineral_opportunity_id='e1000000-0000-4000-8000-000000000001'),3,'pipeline stage history is appended');
select throws_ok($$select public.update_opportunity_pipeline('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','closed_won','negotiation','high',100,'USD',null)$$,'22023',null,'reopening a closed opportunity requires an activity note');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$select public.add_opportunity_product(
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.commodities where code='CU'),
    'Test copper concentrate', 'concentrate', 'available', true,
    100, 200, 't', 300, 't', 'USD', 8000, 't', 'Test supply lot', '[]'::jsonb
  )$$,
  'contributor can record product and offer data'
);
select is(
  (select count(*)::int from public.opportunity_products
   where workspace_id='b1000000-0000-4000-8000-000000000001'
     and mineral_opportunity_id='e1000000-0000-4000-8000-000000000001'
     and monthly_capacity=300),
  1,
  'product offer and monthly capacity persist together'
);
select throws_ok(
  $$select public.add_opportunity_product(
    'b1000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.commodities where code='CU'),
    'Cross-workspace product', 'concentrate', 'available', true,
    null, null, null, null, null, null, null, null, null, '[]'::jsonb
  )$$,
  '42501', null,
  'product RPC rejects a workspace without membership'
);
select throws_ok(
  $$select public.add_opportunity_product(
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    (select id from public.commodities where code='CU'),
    'Invalid copper assay', 'concentrate', 'available', true,
    null, null, null, null, null, null, null, null, null,
    jsonb_build_array(jsonb_build_object(
      'definition_id', (select id from public.specification_definitions
                        where commodity_id=(select id from public.commodities where code='PB')
                          and key='grade_pct' and workspace_id is null),
      'numeric_value', 12, 'unit_code', '%'
    ))
  )$$,
  '22023', null,
  'product RPC rejects a specification from another commodity'
);
select is(public.consume_ai_request_quota('b1000000-0000-4000-8000-000000000001'),true,'workspace member can consume an AI request allowance');
do $quota$
declare request_number integer; allowed boolean;
begin
  for request_number in 1..11 loop
    allowed := public.consume_ai_request_quota('b1000000-0000-4000-8000-000000000001');
  end loop;
end;
$quota$;
select is(public.consume_ai_request_quota('b1000000-0000-4000-8000-000000000001'),false,'AI requests are limited after twelve per minute');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.update_opportunity_pipeline('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','closed_won','negotiation','high',100,'USD','Unauthorized change')$$,'42501',null,'viewer cannot update pipeline stages');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select lives_ok($$insert into public.buyer_requirements(id,workspace_id,buyer_organization_id,title,created_by) values ('e1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Test requirement','a1000000-0000-4000-8000-000000000003')$$,'contributor can create requirement');
select lives_ok(
  $$select public.save_requirement_line_with_specifications(
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000002',
    null,
    (select id from public.commodities where code='CU'),
    'concentrate', 100, 200, 't', null, null, 'Copper grade minimum',
    jsonb_build_array(jsonb_build_object(
      'definition_id', (select id from public.specification_definitions
                        where commodity_id=(select id from public.commodities where code='CU')
                          and key='grade_pct' and workspace_id is null),
      'operator', 'gte', 'numeric_min', 20, 'unit_code', '%'
    ))
  )$$,
  'contributor can atomically save a buyer commodity line and assay threshold'
);
select is(
  (select count(*)::int from public.requirement_specifications rs
   join public.requirement_lines rl on rl.id=rs.requirement_line_id and rl.workspace_id=rs.workspace_id
   where rl.buyer_requirement_id='e1000000-0000-4000-8000-000000000002'
     and rs.operator='gte' and rs.numeric_min=20 and rs.unit_code='%'),
  1,
  'structured buyer specification persists with its line'
);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.save_requirement_line_with_specifications(
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000002',
    null,
    (select id from public.commodities where code='CU'),
    'concentrate', null, null, null, null, null, null, '[]'::jsonb
  )$$,
  '42501', null,
  'viewer cannot write structured buyer specifications'
);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select lives_ok(
  $$do $regression$
  declare
    affected_rows integer;
    line_id uuid := (
      select rl.id
      from public.requirement_lines as rl
      where rl.buyer_requirement_id='e1000000-0000-4000-8000-000000000002'
    );
  begin
    delete from public.requirement_specifications as rs
    where rs.requirement_line_id=line_id;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'Contributor directly deleted requirement specifications.';
    end if;

    delete from public.requirement_lines as rl
    where rl.id=line_id;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'Contributor directly deleted a requirement line.';
    end if;

    perform pg_catalog.set_config('request.jwt.claim.sub','',true);
    begin
      perform public.delete_requirement_line_with_specifications(
        'b1000000-0000-4000-8000-000000000001',
        'e1000000-0000-4000-8000-000000000002',
        line_id
      );
      raise exception 'Unauthenticated requirement-line deletion unexpectedly succeeded.';
    exception
      when insufficient_privilege then
        null;
    end;

    perform pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000008',true);
    begin
      perform public.delete_requirement_line_with_specifications(
        'b1000000-0000-4000-8000-000000000002',
        'e1000000-0000-4000-8000-000000000002',
        line_id
      );
      raise exception 'Cross-workspace requirement-line deletion unexpectedly succeeded.';
    exception
      when insufficient_privilege or no_data_found then
        null;
    end;

    perform pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
    perform public.delete_requirement_line_with_specifications(
      'b1000000-0000-4000-8000-000000000001',
      'e1000000-0000-4000-8000-000000000002',
      line_id
    );
  end;
  $regression$
  $$,
  'contributor RPC deletion works while direct and cross-workspace deletes are blocked'
);
select is(
  (select (select count(*) from public.requirement_lines where buyer_requirement_id='e1000000-0000-4000-8000-000000000002')
        + (select count(*) from public.requirement_specifications rs join public.requirement_lines rl on rl.id=rs.requirement_line_id where rl.buyer_requirement_id='e1000000-0000-4000-8000-000000000002'))::int,
  0,
  'line deletion also removes dependent specification records'
);
select lives_ok($$insert into public.matching_results(id,workspace_id,mineral_opportunity_id,buyer_requirement_id,score,algorithm_version,created_by) values ('e1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002',0.75,'test-v1','a1000000-0000-4000-8000-000000000003')$$,'contributor can create suggested match');
select lives_ok(
  $$select public.save_requirement_line_with_specifications(
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000002',
    null,
    (select id from public.commodities where code='CU'),
    'concentrate', 100, 200, 't', null, null, 'Preserve matching evidence',
    jsonb_build_array(jsonb_build_object(
      'definition_id', (select id from public.specification_definitions
                        where commodity_id=(select id from public.commodities where code='CU')
                          and key='grade_pct' and workspace_id is null),
      'operator', 'gte', 'numeric_min', 20, 'unit_code', '%'
    ))
  )$$,
  'requirement line and specification can be retained for match history'
);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select is(public.delete_buyer_requirement_record('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002'),'archived'::text,'linked requirement is archived without breaking matching history');
do $archive_metadata$
begin
  if not exists (
    select 1
    from public.buyer_requirements as br
    where br.workspace_id='b1000000-0000-4000-8000-000000000001'
      and br.id='e1000000-0000-4000-8000-000000000002'
      and br.archived_at is not null
      and br.updated_at is not null
      and br.updated_by='a1000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Buyer requirement archive metadata does not identify the authenticated owner.';
  end if;
end;
$archive_metadata$;
select is((select count(*)::int from public.requirement_lines where buyer_requirement_id='e1000000-0000-4000-8000-000000000002'),1,'archiving preserves the buyer commodity line');
select is((select count(*)::int from public.requirement_specifications rs join public.requirement_lines rl on rl.id=rs.requirement_line_id where rl.buyer_requirement_id='e1000000-0000-4000-8000-000000000002'),1,'archiving preserves the structured specification');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select throws_ok($$update public.matching_results set score=0.5 where id='e1000000-0000-4000-8000-000000000003'$$,'P0001',null,'matching score is immutable');
with removed as (
  delete from public.matching_results
  where id='e1000000-0000-4000-8000-000000000003'
  returning 1
)
select is((select count(*)::int from removed),0,'matching evidence cannot be deleted');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select throws_ok($$insert into public.workspace_memberships(workspace_id,user_id,role) values ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','owner')$$, '42501', null, 'manager cannot grant self owner');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select lives_ok(
  $statement$
  do $test$
  begin
    insert into public.organization_verification_events(workspace_id,organization_id,previous_status,new_status,method,checked_by)
    values ('b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','unverified','in_review','test','a1000000-0000-4000-8000-000000000004');
    update public.organizations
    set verification_status='in_review', updated_by='a1000000-0000-4000-8000-000000000004'
    where id='c1000000-0000-4000-8000-000000000001';
  end;
  $test$
  $statement$,
  'manager can use verification event workflow'
);
select is((select verification_status from public.organizations where id='c1000000-0000-4000-8000-000000000001'),'in_review','verification event changes status as expected');
select throws_ok($$update public.organizations set verification_status='verified',verified_at=now(),verified_by='a1000000-0000-4000-8000-000000000004' where id='c1000000-0000-4000-8000-000000000001'$$,'P0001',null,'verification requires a corresponding event');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.workspace_memberships(workspace_id,user_id,role,status) values ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000005','admin','active')$$,'owner can grant admin membership');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',true);
select throws_ok($$update public.workspace_memberships set role='owner' where workspace_id='b1000000-0000-4000-8000-000000000001' and user_id='a1000000-0000-4000-8000-000000000005'$$,'42501',null,'admin cannot promote self to owner');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select lives_ok($$update public.matching_results set status='reviewed', updated_by='a1000000-0000-4000-8000-000000000004' where id='e1000000-0000-4000-8000-000000000003'$$,'manager can review matching evidence');
select throws_ok($$insert into public.introductions(workspace_id,matching_result_id,initiated_by,status) values ('b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','sent')$$, 'P0001', null, 'introduction cannot start as sent');
select lives_ok($$insert into public.introductions(id,workspace_id,matching_result_id,initiated_by,status) values ('e1000000-0000-4000-8000-000000000004','b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000004','draft')$$,'manager can create draft introduction after review');
select lives_ok($$update public.introductions set status='sent' where id='e1000000-0000-4000-8000-000000000004'$$,'draft introduction can transition to sent');
select throws_ok($$update public.introductions set status='completed' where id='e1000000-0000-4000-8000-000000000004'$$,'P0001',null,'introduction cannot skip workflow states');
with removed as (
  delete from public.introductions
  where id='e1000000-0000-4000-8000-000000000004'
  returning 1
)
select is((select count(*)::int from removed),0,'introduction history cannot be deleted');
select throws_ok($$insert into public.audit_events(workspace_id,entity_type,action) values ('b1000000-0000-4000-8000-000000000001','forged','INSERT')$$,'42501',null,'audit events cannot be forged through the API');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
insert into public.documents(id,workspace_id,original_filename,classification,uploaded_by,storage_path)
values ('d1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','fixture.txt','restricted','a1000000-0000-4000-8000-000000000001','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000001/restricted.txt'),
 ('d1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','fixture-internal.txt','internal','a1000000-0000-4000-8000-000000000001','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000002/internal.txt'),
 ('d1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','fixture-confidential.txt','confidential','a1000000-0000-4000-8000-000000000001','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),
 ('d1000000-0000-4000-8000-000000000004','b1000000-0000-4000-8000-000000000001','fixture-mismatch.txt','confidential','a1000000-0000-4000-8000-000000000001','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000004/expected.txt'),
 ('d1000000-0000-4000-8000-000000000005','b1000000-0000-4000-8000-000000000001','fixture-owner-delete.txt','restricted','a1000000-0000-4000-8000-000000000001','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt'),
 ('d1000000-0000-4000-8000-000000000006','b1000000-0000-4000-8000-000000000001','fixture-admin-delete.txt','restricted','a1000000-0000-4000-8000-000000000001','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000006/admin-delete.txt');
insert into public.document_links(id,workspace_id,document_id,organization_id)
values ('f1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001');

reset role;
insert into storage.buckets(id,name,public,file_size_limit)
values ('other-test-bucket','other-test-bucket',false,52428800);
insert into storage.objects(bucket_id,name) values
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000001/restricted.txt'),
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000002/internal.txt'),
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000004/wrong.txt'),
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt'),
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000006/admin-delete.txt'),
 ('workspace-documents','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000007/orphan.txt'),
 ('other-test-bucket','workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),1,'owner can read a matching confidential Storage object');
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt'),1,'owner can read a matching restricted Storage object');
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000007/orphan.txt'),0,'Storage object without a document row is hidden');
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000004/wrong.txt'),0,'Storage object with a path different from documents.storage_path is hidden');
select is((select count(*)::int from storage.objects where bucket_id='other-test-bucket' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),0,'matching path in another bucket is hidden');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),1,'manager can read a matching confidential Storage object');
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt'),0,'manager cannot read a restricted Storage object');
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000001'),0,'manager cannot read restricted document metadata');
select is((select count(*)::int from public.document_links where id='f1000000-0000-4000-8000-000000000001'),0,'manager cannot read restricted document links');
with changed as (
  update public.document_links
  set organization_id='c1000000-0000-4000-8000-000000000003'
  where id='f1000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*)::int from changed),0,'manager cannot update restricted document links');
with removed as (
  delete from public.document_links
  where id='f1000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*)::int from removed),0,'manager cannot delete restricted document links');
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000002'),1,'manager retains access to internal document metadata');
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000003'),1,'manager retains access to confidential document metadata');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),0,'viewer cannot read a confidential Storage object');
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt'),0,'viewer cannot read a restricted Storage object');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000002' returning 1
)
select is((select count(*)::int from removed),0,'viewer cannot delete a non-restricted document');
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000002/internal.txt' returning 1
)
select is((select count(*)::int from removed),0,'viewer cannot delete a Storage object');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000008',true);
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt'),0,'member from another workspace cannot read this workspace object');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000002' returning 1
)
select is((select count(*)::int from removed),0,'member from another workspace cannot delete this workspace document');
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt' returning 1
)
select is((select count(*)::int from removed),0,'member from another workspace cannot delete this workspace Storage object');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt'),0,'contributor cannot read a restricted Storage object');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000002' returning 1
)
select is((select count(*)::int from removed),0,'contributor cannot delete a non-restricted document');
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt' returning 1
)
select is((select count(*)::int from removed),0,'contributor cannot delete a restricted Storage object');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
select throws_ok($$insert into public.documents(workspace_id,original_filename,classification,uploaded_by) values ('b1000000-0000-4000-8000-000000000001','manager-restricted.txt','restricted','a1000000-0000-4000-8000-000000000004')$$,'42501',null,'manager cannot create restricted document');
with changed as (
  update public.documents
  set description='manager attempt'
  where id='d1000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*)::int from changed),0,'manager cannot update restricted document metadata');
select throws_ok($$update public.documents set classification='restricted' where id='d1000000-0000-4000-8000-000000000002'$$,'42501',null,'manager cannot classify a document as restricted');
select throws_ok($$insert into public.document_links(workspace_id,document_id,organization_id) values ('b1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003')$$,'42501',null,'manager cannot create restricted document links');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='documents' and record_id='d1000000-0000-4000-8000-000000000001'),0,'manager cannot read restricted document audit metadata');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='document_links' and record_id='f1000000-0000-4000-8000-000000000001'),0,'manager cannot read restricted document link audit metadata');
select throws_ok($$insert into public.document_links(workspace_id,document_id,organization_id) values ('b1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000002')$$, '23503', null, 'document links cannot cross workspace ownership');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000005' returning 1
)
select is((select count(*)::int from removed),0,'manager cannot delete a restricted document');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000003' returning 1
)
select is((select count(*)::int from removed),1,'manager can delete a non-restricted document');
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt' returning 1
)
select is((select count(*)::int from removed),0,'manager cannot delete a restricted Storage object');
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000003/confidential.txt' returning 1
)
select is((select count(*)::int from removed),1,'manager can delete a non-restricted Storage object');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document metadata');
select is((select count(*)::int from public.document_links where id='f1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document links');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='documents' and record_id='d1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document audit metadata');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='document_links' and record_id='f1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document link audit metadata');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',true);
select is((select count(*)::int from public.opportunity_pipeline where workspace_id='b1000000-0000-4000-8000-000000000001'),0,'pipeline rows are isolated from other workspaces');
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document metadata');
select is((select count(*)::int from public.document_links where id='f1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document links');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='documents' and record_id='d1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document audit metadata');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='document_links' and record_id='f1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document link audit metadata');
select is((select count(*)::int from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000006/admin-delete.txt'),1,'workspace admin can read a matching restricted Storage object');
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000006/admin-delete.txt' returning 1
)
select is((select count(*)::int from removed),1,'workspace admin can delete a restricted Storage object');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000006' returning 1
)
select is((select count(*)::int from removed),1,'workspace admin can delete a restricted document');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
with removed as (
  delete from storage.objects where bucket_id='workspace-documents' and name='workspaces/b1000000-0000-4000-8000-000000000001/documents/d1000000-0000-4000-8000-000000000005/owner-delete.txt' returning 1
)
select is((select count(*)::int from removed),1,'workspace owner can delete a restricted Storage object');
with removed as (
  delete from public.documents where id='d1000000-0000-4000-8000-000000000005' returning 1
)
select is((select count(*)::int from removed),1,'workspace owner can delete a restricted document');

select * from finish();
rollback;

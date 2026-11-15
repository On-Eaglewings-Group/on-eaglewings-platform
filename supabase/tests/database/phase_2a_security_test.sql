-- Run after migrations with `supabase test db` in a local Supabase stack.
-- Every fixture is inserted inside this transaction and rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','phase2a-owner-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','phase2a-viewer-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000003','authenticated','authenticated','phase2a-contributor-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000004','authenticated','authenticated','phase2a-manager-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('a1000000-0000-4000-8000-000000000005','authenticated','authenticated','phase2a-owner-b@example.invalid','',now(),'{}','{}',now(),now());

insert into public.user_profiles(user_id, display_name) values
 ('a1000000-0000-4000-8000-000000000001','Test owner A'),
 ('a1000000-0000-4000-8000-000000000002','Test viewer A'),
 ('a1000000-0000-4000-8000-000000000003','Test contributor A'),
 ('a1000000-0000-4000-8000-000000000004','Test manager A'),
 ('a1000000-0000-4000-8000-000000000005','Test owner B');

insert into public.workspaces(id,name,slug) values
 ('b1000000-0000-4000-8000-000000000001','Test Workspace A','phase2a-test-a'),
 ('b1000000-0000-4000-8000-000000000002','Test Workspace B','phase2a-test-b');

insert into public.workspace_memberships(workspace_id,user_id,role,status) values
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','owner','active'),
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','viewer','active'),
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','contributor','active'),
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','manager','active'),
 ('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000005','owner','active');

insert into public.organizations(id,workspace_id,legal_name,normalized_name) values
 ('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Fixture A','fixture a'),
 ('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Fixture B','fixture b');

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
select lives_ok($$insert into public.buyer_requirements(id,workspace_id,buyer_organization_id,title,created_by) values ('e1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Test requirement','a1000000-0000-4000-8000-000000000003')$$,'contributor can create requirement');
select lives_ok($$insert into public.matching_results(id,workspace_id,mineral_opportunity_id,buyer_requirement_id,score,algorithm_version,created_by) values ('e1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002',0.75,'test-v1','a1000000-0000-4000-8000-000000000003')$$,'contributor can create suggested match');
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
insert into public.documents(id,workspace_id,original_filename,classification,uploaded_by)
values ('d1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','fixture.txt','restricted','a1000000-0000-4000-8000-000000000001'),
 ('d1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','fixture-internal.txt','internal','a1000000-0000-4000-8000-000000000001'),
 ('d1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','fixture-confidential.txt','confidential','a1000000-0000-4000-8000-000000000001');
insert into public.document_links(id,workspace_id,document_id,organization_id)
values ('f1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
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

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document metadata');
select is((select count(*)::int from public.document_links where id='f1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document links');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='documents' and record_id='d1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document audit metadata');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='document_links' and record_id='f1000000-0000-4000-8000-000000000001'),1,'workspace owner can read restricted document link audit metadata');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',true);
select is((select count(*)::int from public.documents where id='d1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document metadata');
select is((select count(*)::int from public.document_links where id='f1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document links');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='documents' and record_id='d1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document audit metadata');
select is((select count(*)::int from public.audit_events where workspace_id='b1000000-0000-4000-8000-000000000001' and entity_type='document_links' and record_id='f1000000-0000-4000-8000-000000000001'),1,'workspace admin can read restricted document link audit metadata');

select * from finish();
rollback;

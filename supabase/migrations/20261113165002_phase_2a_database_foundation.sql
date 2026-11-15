-- On-Eaglewings Phase 2A: workspace-scoped relational foundation.
-- This migration contains no business-record seed data.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated, service_role;
grant usage on schema public to authenticated;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  default_currency text not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'UTC',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id)
);

create index workspaces_creator_idx on public.workspaces (created_by) where created_by is not null;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 200),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'contributor', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  invited_by uuid references public.user_profiles(user_id) on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  unique (workspace_id, user_id, role)
);
create index workspace_memberships_user_status_idx on public.workspace_memberships (user_id, status, workspace_id);
create index workspace_memberships_inviter_idx on public.workspace_memberships (invited_by) where invited_by is not null;

create table public.commodities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.units (
  code text primary key,
  name text not null,
  dimension text not null check (dimension in ('mass', 'fraction')),
  to_base_factor numeric(24,12) not null check (to_base_factor > 0),
  base_unit_code text not null,
  created_at timestamptz not null default now(),
  foreign key (base_unit_code) references public.units(code) on update restrict on delete restrict
);
create index units_base_unit_idx on public.units (base_unit_code);

create table public.specification_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete restrict,
  commodity_id uuid not null references public.commodities(id) on delete restrict,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (length(btrim(label)) > 0),
  value_type text not null check (value_type in ('number', 'text', 'boolean')),
  unit_code text references public.units(code) on update restrict on delete restrict,
  description text,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, commodity_id),
  unique (workspace_id, commodity_id, key),
  check ((value_type = 'number' and unit_code is not null) or (value_type in ('text', 'boolean') and unit_code is null))
);
create unique index specification_definitions_global_key_idx
  on public.specification_definitions (commodity_id, key) where workspace_id is null;
create unique index specification_definitions_workspace_key_idx
  on public.specification_definitions (workspace_id, commodity_id, key) where workspace_id is not null;
create index specification_definitions_commodity_idx on public.specification_definitions (commodity_id, workspace_id);
create index specification_definitions_creator_idx on public.specification_definitions (created_by) where created_by is not null;
create index specification_definitions_unit_idx on public.specification_definitions (unit_code) where unit_code is not null;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  legal_name text not null check (length(btrim(legal_name)) > 0),
  normalized_name text not null check (normalized_name = lower(btrim(normalized_name))),
  trading_name text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  registration_number text,
  website_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'in_review', 'verified', 'rejected', 'suspended')),
  verified_at timestamptz,
  verified_by uuid references public.user_profiles(user_id) on delete set null,
  source text,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check ((verification_status = 'verified' and verified_at is not null and verified_by is not null)
      or verification_status <> 'verified')
);
create unique index organizations_name_per_workspace_idx on public.organizations (workspace_id, normalized_name) where archived_at is null;
create unique index organizations_registration_per_workspace_idx
  on public.organizations (workspace_id, country_code, lower(btrim(registration_number)))
  where registration_number is not null and archived_at is null;
create index organizations_workspace_verification_idx on public.organizations (workspace_id, verification_status, updated_at desc);
create index organizations_verified_by_idx on public.organizations (verified_by) where verified_by is not null;
create index organizations_creator_idx on public.organizations (created_by) where created_by is not null;
create index organizations_updater_idx on public.organizations (updated_by) where updated_by is not null;

create table public.producer_profiles (
  workspace_id uuid not null,
  organization_id uuid not null,
  description text,
  production_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, organization_id),
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict
);

create table public.buyer_profiles (
  workspace_id uuid not null,
  organization_id uuid not null,
  purchasing_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, organization_id),
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict
);

create table public.organization_verification_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  previous_status text check (previous_status is null or previous_status in ('unverified', 'in_review', 'verified', 'rejected', 'suspended')),
  new_status text not null check (new_status in ('unverified', 'in_review', 'verified', 'rejected', 'suspended')),
  method text not null check (length(btrim(method)) > 0),
  evidence_reference text,
  notes text,
  checked_at timestamptz not null default now(),
  checked_by uuid not null references public.user_profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict
);
create index organization_verification_events_org_idx on public.organization_verification_events (workspace_id, organization_id, checked_at desc);
create index organization_verification_events_checker_idx on public.organization_verification_events (checked_by, checked_at desc);

create table public.mines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  region text,
  locality text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  status text not null default 'unverified' check (status in ('unverified', 'operating', 'care_and_maintenance', 'closed', 'unknown')),
  source text,
  external_reference text,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check ((latitude is null) = (longitude is null))
);
create index mines_workspace_status_idx on public.mines (workspace_id, status, updated_at desc);
create index mines_workspace_name_idx on public.mines (workspace_id, lower(name));
create index mines_creator_idx on public.mines (created_by) where created_by is not null;
create index mines_updater_idx on public.mines (updated_by) where updated_by is not null;

create table public.mine_organization_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  mine_id uuid not null,
  organization_id uuid not null,
  role text not null check (role in ('owner', 'operator', 'producer', 'associated')),
  starts_on date,
  ends_on date,
  notes text,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, mine_id, organization_id, role),
  foreign key (workspace_id, mine_id) references public.mines(workspace_id, id) on delete restrict,
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index mine_organization_roles_org_idx on public.mine_organization_roles (workspace_id, organization_id, role);
create index mine_organization_roles_creator_idx on public.mine_organization_roles (created_by) where created_by is not null;

create table public.mineral_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  producer_organization_id uuid not null,
  mine_id uuid,
  commodity_id uuid not null references public.commodities(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  product_form text not null check (product_form in ('ore', 'concentrate', 'slag', 'cathode', 'ingot', 'intermediate', 'other')),
  status text not null default 'unverified' check (status in ('unverified', 'available', 'limited', 'unavailable', 'archived')),
  description text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, id, commodity_id),
  foreign key (workspace_id, producer_organization_id) references public.organizations(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mine_id) references public.mines(workspace_id, id) on delete restrict
);
create index mineral_products_org_idx on public.mineral_products (workspace_id, producer_organization_id, status);
create index mineral_products_mine_idx on public.mineral_products (workspace_id, mine_id) where mine_id is not null;
create index mineral_products_commodity_idx on public.mineral_products (workspace_id, commodity_id, status);
create index mineral_products_creator_idx on public.mineral_products (created_by) where created_by is not null;
create index mineral_products_updater_idx on public.mineral_products (updated_by) where updated_by is not null;

create table public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  mineral_product_id uuid not null,
  commodity_id uuid not null,
  specification_definition_id uuid not null,
  numeric_value numeric(24,8),
  text_value text,
  boolean_value boolean,
  unit_code text references public.units(code) on update restrict on delete restrict,
  basis text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, mineral_product_id, specification_definition_id),
  foreign key (workspace_id, mineral_product_id, commodity_id) references public.mineral_products(workspace_id, id, commodity_id) on delete restrict,
  foreign key (specification_definition_id, commodity_id) references public.specification_definitions(id, commodity_id) on delete restrict,
  check (num_nonnulls(numeric_value, text_value, boolean_value) = 1),
  check ((numeric_value is null and unit_code is null) or (numeric_value is not null and unit_code is not null))
);
create index product_specifications_definition_idx on public.product_specifications (workspace_id, specification_definition_id);
create index product_specifications_definition_fk_idx on public.product_specifications (specification_definition_id, commodity_id);
create index product_specifications_unit_idx on public.product_specifications (unit_code) where unit_code is not null;

create table public.mineral_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  source_organization_id uuid,
  mine_id uuid,
  owner_user_id uuid,
  title text not null check (length(btrim(title)) > 0),
  status text not null default 'lead' check (status in ('lead', 'qualifying', 'qualified', 'in_negotiation', 'awaiting_approval', 'committed', 'lost', 'on_hold', 'closed')),
  confidence smallint check (confidence between 0 and 100),
  available_from date,
  available_until date,
  source text,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, source_organization_id) references public.organizations(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mine_id) references public.mines(workspace_id, id) on delete restrict,
  foreign key (workspace_id, owner_user_id) references public.workspace_memberships(workspace_id, user_id) on delete restrict,
  check (available_until is null or available_from is null or available_until >= available_from)
);
create index mineral_opportunities_workspace_status_idx on public.mineral_opportunities (workspace_id, status, updated_at desc);
create index mineral_opportunities_source_org_idx on public.mineral_opportunities (workspace_id, source_organization_id) where source_organization_id is not null;
create index mineral_opportunities_mine_idx on public.mineral_opportunities (workspace_id, mine_id) where mine_id is not null;
create index mineral_opportunities_owner_idx on public.mineral_opportunities (workspace_id, owner_user_id, status) where owner_user_id is not null;
create index mineral_opportunities_creator_idx on public.mineral_opportunities (created_by) where created_by is not null;
create index mineral_opportunities_updater_idx on public.mineral_opportunities (updated_by) where updated_by is not null;

create table public.opportunity_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  mineral_opportunity_id uuid not null,
  mineral_product_id uuid not null,
  quantity_min numeric(24,8) check (quantity_min is null or quantity_min >= 0),
  quantity_max numeric(24,8) check (quantity_max is null or quantity_max >= 0),
  unit_code text references public.units(code) on update restrict on delete restrict,
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  indicative_price numeric(24,8) check (indicative_price is null or indicative_price >= 0),
  price_unit_code text references public.units(code) on update restrict on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, mineral_opportunity_id, mineral_product_id),
  foreign key (workspace_id, mineral_opportunity_id) references public.mineral_opportunities(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mineral_product_id) references public.mineral_products(workspace_id, id) on delete restrict,
  check ((quantity_min is null and quantity_max is null) or unit_code is not null),
  check (quantity_min is null or quantity_max is null or quantity_min <= quantity_max),
  check (indicative_price is null or (currency_code is not null and price_unit_code is not null))
);
create index opportunity_products_product_idx on public.opportunity_products (workspace_id, mineral_product_id);
create index opportunity_products_unit_idx on public.opportunity_products (unit_code) where unit_code is not null;
create index opportunity_products_price_unit_idx on public.opportunity_products (price_unit_code) where price_unit_code is not null;

create table public.buyer_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  buyer_organization_id uuid not null,
  owner_user_id uuid,
  title text not null check (length(btrim(title)) > 0),
  status text not null default 'lead' check (status in ('lead', 'qualifying', 'qualified', 'sourcing', 'matched', 'fulfilled', 'on_hold', 'closed', 'cancelled')),
  target_delivery_from date,
  target_delivery_until date,
  delivery_country_code text check (delivery_country_code is null or delivery_country_code ~ '^[A-Z]{2}$'),
  delivery_region text,
  delivery_location text,
  incoterm text,
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  notes text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, buyer_organization_id) references public.organizations(workspace_id, id) on delete restrict,
  foreign key (workspace_id, owner_user_id) references public.workspace_memberships(workspace_id, user_id) on delete restrict,
  check (target_delivery_until is null or target_delivery_from is null or target_delivery_until >= target_delivery_from)
);
create index buyer_requirements_workspace_status_idx on public.buyer_requirements (workspace_id, status, updated_at desc);
create index buyer_requirements_buyer_idx on public.buyer_requirements (workspace_id, buyer_organization_id, status);
create index buyer_requirements_owner_idx on public.buyer_requirements (workspace_id, owner_user_id, status) where owner_user_id is not null;
create index buyer_requirements_creator_idx on public.buyer_requirements (created_by) where created_by is not null;
create index buyer_requirements_updater_idx on public.buyer_requirements (updated_by) where updated_by is not null;

create table public.requirement_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  buyer_requirement_id uuid not null,
  commodity_id uuid not null references public.commodities(id) on delete restrict,
  product_form text check (product_form is null or product_form in ('ore', 'concentrate', 'slag', 'cathode', 'ingot', 'intermediate', 'other')),
  quantity_min numeric(24,8) check (quantity_min is null or quantity_min >= 0),
  quantity_max numeric(24,8) check (quantity_max is null or quantity_max >= 0),
  unit_code text references public.units(code) on update restrict on delete restrict,
  delivery_from date,
  delivery_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, id, commodity_id),
  foreign key (workspace_id, buyer_requirement_id) references public.buyer_requirements(workspace_id, id) on delete restrict,
  check ((quantity_min is null and quantity_max is null) or unit_code is not null),
  check (quantity_min is null or quantity_max is null or quantity_min <= quantity_max),
  check (delivery_until is null or delivery_from is null or delivery_until >= delivery_from)
);
create index requirement_lines_commodity_idx on public.requirement_lines (workspace_id, commodity_id);
create index requirement_lines_parent_idx on public.requirement_lines (workspace_id, buyer_requirement_id);
create index requirement_lines_unit_idx on public.requirement_lines (unit_code) where unit_code is not null;

create table public.requirement_specifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  requirement_line_id uuid not null,
  commodity_id uuid not null,
  specification_definition_id uuid not null,
  operator text not null default 'range' check (operator in ('eq', 'gte', 'lte', 'range', 'contains')),
  numeric_min numeric(24,8),
  numeric_max numeric(24,8),
  numeric_target numeric(24,8),
  text_value text,
  boolean_value boolean,
  unit_code text references public.units(code) on update restrict on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, requirement_line_id, specification_definition_id),
  foreign key (workspace_id, requirement_line_id, commodity_id) references public.requirement_lines(workspace_id, id, commodity_id) on delete restrict,
  foreign key (specification_definition_id, commodity_id) references public.specification_definitions(id, commodity_id) on delete restrict,
  check (numeric_min is null or numeric_max is null or numeric_min <= numeric_max),
  check (
    (num_nonnulls(numeric_min, numeric_max, numeric_target) > 0 and text_value is null and boolean_value is null and unit_code is not null)
    or (num_nonnulls(numeric_min, numeric_max, numeric_target) = 0 and text_value is not null and boolean_value is null and unit_code is null)
    or (num_nonnulls(numeric_min, numeric_max, numeric_target) = 0 and text_value is null and boolean_value is not null and unit_code is null)
  ),
  check (operator <> 'contains' or text_value is not null),
  check (operator not in ('gte', 'lte', 'range') or num_nonnulls(numeric_min, numeric_max, numeric_target) > 0)
);
create index requirement_specifications_definition_idx on public.requirement_specifications (workspace_id, specification_definition_id);
create index requirement_specifications_definition_fk_idx on public.requirement_specifications (specification_definition_id, commodity_id);
create index requirement_specifications_unit_idx on public.requirement_specifications (unit_code) where unit_code is not null;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) > 0),
  job_title text,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive', 'unverified')),
  notes text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create index contacts_workspace_name_idx on public.contacts (workspace_id, lower(full_name));
create index contacts_workspace_email_idx on public.contacts (workspace_id, lower(email)) where email is not null;
create index contacts_creator_idx on public.contacts (created_by) where created_by is not null;
create index contacts_updater_idx on public.contacts (updated_by) where updated_by is not null;

create table public.contact_organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contact_id uuid not null,
  organization_id uuid not null,
  role text,
  is_primary boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, contact_id, organization_id),
  foreign key (workspace_id, contact_id) references public.contacts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index contact_organizations_one_primary_idx on public.contact_organizations (workspace_id, contact_id) where is_primary;
create index contact_organizations_org_idx on public.contact_organizations (workspace_id, organization_id, contact_id);

create table public.commercial_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organization_id uuid not null,
  relationship_type text not null check (relationship_type in ('supplier', 'buyer', 'partner', 'service_provider', 'other')),
  status text not null default 'prospect' check (status in ('prospect', 'active', 'paused', 'closed')),
  owner_user_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict,
  foreign key (workspace_id, owner_user_id) references public.workspace_memberships(workspace_id, user_id) on delete restrict,
  check (ended_at is null or started_at is null or ended_at >= started_at)
);
create index commercial_relationships_org_idx on public.commercial_relationships (workspace_id, organization_id, status);
create index commercial_relationships_owner_idx on public.commercial_relationships (workspace_id, owner_user_id, status) where owner_user_id is not null;
create index commercial_relationships_creator_idx on public.commercial_relationships (created_by) where created_by is not null;
create index commercial_relationships_updater_idx on public.commercial_relationships (updated_by) where updated_by is not null;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  location text,
  agenda text,
  outcome text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  mineral_opportunity_id uuid,
  buyer_requirement_id uuid,
  commercial_relationship_id uuid,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, mineral_opportunity_id) references public.mineral_opportunities(workspace_id, id) on delete restrict,
  foreign key (workspace_id, buyer_requirement_id) references public.buyer_requirements(workspace_id, id) on delete restrict,
  foreign key (workspace_id, commercial_relationship_id) references public.commercial_relationships(workspace_id, id) on delete restrict,
  check (ends_at is null or ends_at > starts_at)
);
create index meetings_workspace_start_idx on public.meetings (workspace_id, starts_at desc);
create index meetings_opportunity_idx on public.meetings (workspace_id, mineral_opportunity_id) where mineral_opportunity_id is not null;
create index meetings_requirement_idx on public.meetings (workspace_id, buyer_requirement_id) where buyer_requirement_id is not null;
create index meetings_relationship_idx on public.meetings (workspace_id, commercial_relationship_id) where commercial_relationship_id is not null;
create index meetings_creator_idx on public.meetings (created_by) where created_by is not null;
create index meetings_updater_idx on public.meetings (updated_by) where updated_by is not null;

create table public.meeting_attendees (
  workspace_id uuid not null,
  meeting_id uuid not null,
  contact_id uuid not null,
  attendance_status text not null default 'invited' check (attendance_status in ('invited', 'accepted', 'declined', 'attended', 'absent')),
  attendee_role text,
  created_at timestamptz not null default now(),
  primary key (workspace_id, meeting_id, contact_id),
  foreign key (workspace_id, meeting_id) references public.meetings(workspace_id, id) on delete restrict,
  foreign key (workspace_id, contact_id) references public.contacts(workspace_id, id) on delete restrict
);
create index meeting_attendees_contact_idx on public.meeting_attendees (workspace_id, contact_id, meeting_id);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text,
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  assigned_to uuid,
  contact_id uuid,
  meeting_id uuid,
  mineral_opportunity_id uuid,
  buyer_requirement_id uuid,
  commercial_relationship_id uuid,
  completed_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, assigned_to) references public.workspace_memberships(workspace_id, user_id) on delete restrict,
  foreign key (workspace_id, contact_id) references public.contacts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, meeting_id) references public.meetings(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mineral_opportunity_id) references public.mineral_opportunities(workspace_id, id) on delete restrict,
  foreign key (workspace_id, buyer_requirement_id) references public.buyer_requirements(workspace_id, id) on delete restrict,
  foreign key (workspace_id, commercial_relationship_id) references public.commercial_relationships(workspace_id, id) on delete restrict,
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);
create index follow_ups_due_idx on public.follow_ups (workspace_id, due_at, status) where status in ('open', 'in_progress');
create index follow_ups_assignee_idx on public.follow_ups (workspace_id, assigned_to, status) where assigned_to is not null;
create index follow_ups_contact_idx on public.follow_ups (workspace_id, contact_id) where contact_id is not null;
create index follow_ups_meeting_idx on public.follow_ups (workspace_id, meeting_id) where meeting_id is not null;
create index follow_ups_opportunity_idx on public.follow_ups (workspace_id, mineral_opportunity_id) where mineral_opportunity_id is not null;
create index follow_ups_requirement_idx on public.follow_ups (workspace_id, buyer_requirement_id) where buyer_requirement_id is not null;
create index follow_ups_relationship_idx on public.follow_ups (workspace_id, commercial_relationship_id) where commercial_relationship_id is not null;
create index follow_ups_creator_idx on public.follow_ups (created_by) where created_by is not null;
create index follow_ups_updater_idx on public.follow_ups (updated_by) where updated_by is not null;

create table public.matching_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  mineral_opportunity_id uuid not null,
  buyer_requirement_id uuid not null,
  score numeric(6,5) not null check (score between 0 and 1),
  score_explanation jsonb not null default '{}'::jsonb check (jsonb_typeof(score_explanation) = 'object'),
  algorithm_version text not null check (length(btrim(algorithm_version)) > 0),
  generated_at timestamptz not null default now(),
  status text not null default 'suggested' check (status in ('suggested', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.user_profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.user_profiles(user_id) on delete set null,
  updated_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, mineral_opportunity_id) references public.mineral_opportunities(workspace_id, id) on delete restrict,
  foreign key (workspace_id, buyer_requirement_id) references public.buyer_requirements(workspace_id, id) on delete restrict,
  check ((status = 'suggested' and reviewed_at is null and reviewed_by is null)
      or (status in ('reviewed', 'dismissed') and reviewed_at is not null and reviewed_by is not null))
);
create index matching_results_opportunity_idx on public.matching_results (workspace_id, mineral_opportunity_id, generated_at desc);
create index matching_results_requirement_idx on public.matching_results (workspace_id, buyer_requirement_id, generated_at desc);
create index matching_results_review_idx on public.matching_results (workspace_id, status, score desc);
create index matching_results_reviewer_idx on public.matching_results (reviewed_by, reviewed_at desc) where reviewed_by is not null;
create index matching_results_creator_idx on public.matching_results (created_by) where created_by is not null;
create index matching_results_updater_idx on public.matching_results (updated_by) where updated_by is not null;

create table public.introductions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  matching_result_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'completed', 'withdrawn')),
  initiated_by uuid not null references public.user_profiles(user_id) on delete restrict,
  introduced_at timestamptz,
  outcome text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, matching_result_id),
  foreign key (workspace_id, matching_result_id) references public.matching_results(workspace_id, id) on delete restrict,
  check ((status = 'draft' and introduced_at is null)
      or status = 'withdrawn'
      or (status in ('sent', 'accepted', 'declined', 'completed') and introduced_at is not null))
);
create index introductions_workspace_status_idx on public.introductions (workspace_id, status, updated_at desc);
create index introductions_initiator_idx on public.introductions (initiated_by, created_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  original_filename text not null check (length(btrim(original_filename)) > 0),
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[a-fA-F0-9]{64}$'),
  document_type text,
  classification text not null default 'confidential' check (classification in ('internal', 'confidential', 'restricted')),
  description text,
  archived_at timestamptz,
  uploaded_by uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create index documents_workspace_created_idx on public.documents (workspace_id, created_at desc) where archived_at is null;
create index documents_workspace_classification_idx on public.documents (workspace_id, classification);
create index documents_uploader_idx on public.documents (uploaded_by, created_at desc) where uploaded_by is not null;

create table public.document_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  document_id uuid not null,
  organization_id uuid,
  mine_id uuid,
  mineral_product_id uuid,
  mineral_opportunity_id uuid,
  buyer_requirement_id uuid,
  commercial_relationship_id uuid,
  contact_id uuid,
  meeting_id uuid,
  follow_up_id uuid,
  matching_result_id uuid,
  introduction_id uuid,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, document_id, organization_id, mine_id, mineral_product_id, mineral_opportunity_id, buyer_requirement_id, commercial_relationship_id, contact_id, meeting_id, follow_up_id, matching_result_id, introduction_id),
  foreign key (workspace_id, document_id) references public.documents(workspace_id, id) on delete restrict,
  foreign key (workspace_id, organization_id) references public.organizations(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mine_id) references public.mines(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mineral_product_id) references public.mineral_products(workspace_id, id) on delete restrict,
  foreign key (workspace_id, mineral_opportunity_id) references public.mineral_opportunities(workspace_id, id) on delete restrict,
  foreign key (workspace_id, buyer_requirement_id) references public.buyer_requirements(workspace_id, id) on delete restrict,
  foreign key (workspace_id, commercial_relationship_id) references public.commercial_relationships(workspace_id, id) on delete restrict,
  foreign key (workspace_id, contact_id) references public.contacts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, meeting_id) references public.meetings(workspace_id, id) on delete restrict,
  foreign key (workspace_id, follow_up_id) references public.follow_ups(workspace_id, id) on delete restrict,
  foreign key (workspace_id, matching_result_id) references public.matching_results(workspace_id, id) on delete restrict,
  foreign key (workspace_id, introduction_id) references public.introductions(workspace_id, id) on delete restrict,
  check (num_nonnulls(organization_id, mine_id, mineral_product_id, mineral_opportunity_id, buyer_requirement_id,
    commercial_relationship_id, contact_id, meeting_id, follow_up_id, matching_result_id, introduction_id) = 1)
);
create index document_links_document_idx on public.document_links (workspace_id, document_id);
create index document_links_org_idx on public.document_links (workspace_id, organization_id) where organization_id is not null;
create index document_links_mine_idx on public.document_links (workspace_id, mine_id) where mine_id is not null;
create index document_links_product_idx on public.document_links (workspace_id, mineral_product_id) where mineral_product_id is not null;
create index document_links_opportunity_idx on public.document_links (workspace_id, mineral_opportunity_id) where mineral_opportunity_id is not null;
create index document_links_requirement_idx on public.document_links (workspace_id, buyer_requirement_id) where buyer_requirement_id is not null;
create index document_links_relationship_idx on public.document_links (workspace_id, commercial_relationship_id) where commercial_relationship_id is not null;
create index document_links_contact_idx on public.document_links (workspace_id, contact_id) where contact_id is not null;
create index document_links_meeting_idx on public.document_links (workspace_id, meeting_id) where meeting_id is not null;
create index document_links_follow_up_idx on public.document_links (workspace_id, follow_up_id) where follow_up_id is not null;
create index document_links_match_idx on public.document_links (workspace_id, matching_result_id) where matching_result_id is not null;
create index document_links_intro_idx on public.document_links (workspace_id, introduction_id) where introduction_id is not null;
create unique index document_links_org_unique_idx on public.document_links (workspace_id, document_id, organization_id) where organization_id is not null;
create unique index document_links_mine_unique_idx on public.document_links (workspace_id, document_id, mine_id) where mine_id is not null;
create unique index document_links_product_unique_idx on public.document_links (workspace_id, document_id, mineral_product_id) where mineral_product_id is not null;
create unique index document_links_opportunity_unique_idx on public.document_links (workspace_id, document_id, mineral_opportunity_id) where mineral_opportunity_id is not null;
create unique index document_links_requirement_unique_idx on public.document_links (workspace_id, document_id, buyer_requirement_id) where buyer_requirement_id is not null;
create unique index document_links_relationship_unique_idx on public.document_links (workspace_id, document_id, commercial_relationship_id) where commercial_relationship_id is not null;
create unique index document_links_contact_unique_idx on public.document_links (workspace_id, document_id, contact_id) where contact_id is not null;
create unique index document_links_meeting_unique_idx on public.document_links (workspace_id, document_id, meeting_id) where meeting_id is not null;
create unique index document_links_follow_up_unique_idx on public.document_links (workspace_id, document_id, follow_up_id) where follow_up_id is not null;
create unique index document_links_match_unique_idx on public.document_links (workspace_id, document_id, matching_result_id) where matching_result_id is not null;
create unique index document_links_intro_unique_idx on public.document_links (workspace_id, document_id, introduction_id) where introduction_id is not null;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  entity_type text not null,
  record_id uuid,
  record_key jsonb not null default '{}'::jsonb check (jsonb_typeof(record_key) = 'object'),
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields text[] not null default '{}',
  actor_id uuid references public.user_profiles(user_id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index audit_events_workspace_time_idx on public.audit_events (workspace_id, occurred_at desc);
create index audit_events_record_idx on public.audit_events (workspace_id, entity_type, record_id, occurred_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, occurred_at desc) where actor_id is not null;

-- Reference data explicitly requested by Phase 2A; these are catalogue rows, not business records.
insert into public.commodities (code, name) values
  ('CU', 'Copper'), ('PB', 'Lead'), ('ZN', 'Zinc'), ('NI', 'Nickel');

insert into public.units (code, name, dimension, to_base_factor, base_unit_code) values
  ('kg', 'Kilogram', 'mass', 1, 'kg'),
  ('t', 'Metric tonne', 'mass', 1000, 'kg'),
  ('%', 'Percent', 'fraction', 0.01, '%'),
  ('ppm', 'Parts per million', 'fraction', 0.0001, '%');

-- Shared membership authorization helpers are isolated from exposed schemas. Fixed search_path,
-- auth.uid validation, narrowly granted EXECUTE, and no caller-controlled SQL identifiers prevent
-- helper misuse while avoiding recursive RLS evaluation of workspace_memberships.
create function private.has_workspace_role(p_workspace_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_memberships as wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.status = 'active'
      and (p_roles is null or wm.role = any (p_roles))
  );
$function$;

create function private.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_memberships as mine
    join public.workspace_memberships as theirs using (workspace_id)
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = p_user_id
      and theirs.status = 'active'
  );
$function$;

revoke all on function private.has_workspace_role(uuid, text[]) from public, anon;
revoke all on function private.shares_workspace_with(uuid) from public, anon;
grant execute on function private.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function private.shares_workspace_with(uuid) to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create function private.guard_actor_columns()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  new_row jsonb := to_jsonb(new);
  old_row jsonb;
  creator_id uuid;
  updater_id uuid;
begin
  if tg_op = 'INSERT' then
    creator_id := nullif(new_row->>tg_argv[0], '')::uuid;
    if creator_id is not null and creator_id is distinct from actor_id then
      raise exception 'Creator fields must identify the current user';
    end if;
    if actor_id is not null then
      new_row := jsonb_set(new_row, array[tg_argv[0]], to_jsonb(actor_id), true);
    end if;
  else
    old_row := to_jsonb(old);
    if new_row->>tg_argv[0] is distinct from old_row->>tg_argv[0] then
      raise exception 'Creator fields are immutable';
    end if;
  end if;

  if tg_argv[1] <> '' then
    updater_id := nullif(new_row->>tg_argv[1], '')::uuid;
    if updater_id is not null and updater_id is distinct from actor_id then
      raise exception 'Updater fields must identify the current user';
    end if;
    new_row := jsonb_set(new_row, array[tg_argv[1]], coalesce(to_jsonb(actor_id), 'null'::jsonb), true);
  end if;

  new := jsonb_populate_record(new, new_row);
  return new;
end;
$function$;
revoke all on function private.guard_actor_columns() from public, anon, authenticated;

create function private.prevent_workspace_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_table_name = 'workspaces' then
    if new.id is distinct from old.id then
      raise exception 'Workspace identity cannot be changed';
    end if;
  else
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'A record cannot be moved between workspaces';
    end if;
    if to_jsonb(new)->>'id' is distinct from to_jsonb(old)->>'id' then
      raise exception 'Record identity cannot be changed';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function private.prevent_workspace_identity_change() from public, anon, authenticated;

create function private.validate_specification_value()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  definition public.specification_definitions%rowtype;
  unit_dimension text;
begin
  select * into definition
  from public.specification_definitions sd
  where sd.id = new.specification_definition_id
    and sd.commodity_id = new.commodity_id;

  if not found then
    raise exception 'Specification definition does not exist for this commodity';
  end if;
  if definition.workspace_id is not null and definition.workspace_id <> new.workspace_id then
    raise exception 'Specification definition belongs to another workspace';
  end if;

  if tg_table_name = 'product_specifications' then
    if definition.value_type = 'number' and (new.numeric_value is null or new.text_value is not null or new.boolean_value is not null or new.unit_code is distinct from definition.unit_code) then
      raise exception 'Product specification value does not match numeric definition and unit';
    elsif definition.value_type = 'text' and (new.text_value is null or new.numeric_value is not null or new.boolean_value is not null or new.unit_code is not null) then
      raise exception 'Product specification value does not match text definition';
    elsif definition.value_type = 'boolean' and (new.boolean_value is null or new.numeric_value is not null or new.text_value is not null or new.unit_code is not null) then
      raise exception 'Product specification value does not match boolean definition';
    end if;
  else
    if definition.value_type = 'number' and (num_nonnulls(new.numeric_min, new.numeric_max, new.numeric_target) = 0 or new.text_value is not null or new.boolean_value is not null or new.unit_code is distinct from definition.unit_code) then
      raise exception 'Requirement specification does not match numeric definition and unit';
    elsif definition.value_type = 'text' and (new.text_value is null or num_nonnulls(new.numeric_min, new.numeric_max, new.numeric_target) <> 0 or new.boolean_value is not null or new.unit_code is not null) then
      raise exception 'Requirement specification does not match text definition';
    elsif definition.value_type = 'boolean' and (new.boolean_value is null or num_nonnulls(new.numeric_min, new.numeric_max, new.numeric_target) <> 0 or new.text_value is not null or new.unit_code is not null) then
      raise exception 'Requirement specification does not match boolean definition';
    end if;
    if definition.value_type = 'number' then
      if new.operator = 'eq' and (new.numeric_target is null or new.numeric_min is not null or new.numeric_max is not null) then
        raise exception 'Numeric equality requires one target value';
      elsif new.operator = 'gte' and (new.numeric_min is null or new.numeric_max is not null or new.numeric_target is not null) then
        raise exception 'Numeric gte requires only a minimum value';
      elsif new.operator = 'lte' and (new.numeric_max is null or new.numeric_min is not null or new.numeric_target is not null) then
        raise exception 'Numeric lte requires only a maximum value';
      elsif new.operator = 'range' and (new.numeric_min is null or new.numeric_max is null or new.numeric_target is not null) then
        raise exception 'Numeric range requires minimum and maximum values';
      elsif new.operator = 'contains' then
        raise exception 'Numeric specifications do not support contains';
      end if;
    elsif definition.value_type = 'text' and new.operator not in ('eq', 'contains') then
      raise exception 'Text specifications support only eq and contains';
    elsif definition.value_type = 'boolean' and new.operator <> 'eq' then
      raise exception 'Boolean specifications support only eq';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function private.validate_specification_value() from public, anon, authenticated;

create function private.validate_quantity_unit()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  dimension_name text;
  quantity_unit text;
begin
  if tg_table_name = 'opportunity_products' then
    foreach quantity_unit in array array[new.unit_code, new.price_unit_code]
    loop
      if quantity_unit is not null then
        select dimension into dimension_name from public.units where code = quantity_unit;
        if dimension_name is distinct from 'mass' then
          raise exception 'Opportunity quantities and price bases must use a mass unit';
        end if;
      end if;
    end loop;
  else
    if new.unit_code is not null then
      select dimension into dimension_name from public.units where code = new.unit_code;
      if dimension_name is distinct from 'mass' then
        raise exception 'Requirement quantities must use a mass unit';
      end if;
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function private.validate_quantity_unit() from public, anon, authenticated;

create function private.protect_organization_verification()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.verification_status <> 'unverified' or new.verified_at is not null or new.verified_by is not null then
      raise exception 'Organizations must start unverified; use the verification event workflow';
    end if;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    if not private.has_workspace_role(new.workspace_id, array['owner', 'admin', 'manager']) then
      raise exception 'Only workspace managers may change organization verification status';
    end if;
    if not exists (
      select 1 from public.organization_verification_events e
      where e.workspace_id = new.workspace_id
        and e.organization_id = new.id
        and e.previous_status is not distinct from old.verification_status
        and e.new_status = new.verification_status
        and e.checked_by = (select auth.uid())
        and e.created_at = transaction_timestamp()
    ) then
      raise exception 'A verification event by the current user is required';
    end if;
    if new.verification_status = 'verified' then
      new.verified_at := now();
      new.verified_by := (select auth.uid());
    else
      new.verified_at := null;
      new.verified_by := null;
    end if;
  elsif new.verified_at is distinct from old.verified_at or new.verified_by is distinct from old.verified_by then
    raise exception 'Verification metadata is set by the verification workflow';
  end if;
  return new;
end;
$function$;
revoke all on function private.protect_organization_verification() from public, anon, authenticated;

create function private.protect_membership_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_workspace uuid;
  active_owners integer;
begin
  if auth.uid() is null
     and session_user <> 'postgres'
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'An authenticated or trusted administrative context is required';
  end if;
  if tg_op = 'UPDATE' and (new.workspace_id <> old.workspace_id or new.user_id <> old.user_id) then
    raise exception 'Membership identity cannot be changed; delete and re-invite instead';
  end if;
  if tg_op = 'INSERT' then
    if new.invited_by is not null and new.invited_by is distinct from (select auth.uid()) then
      raise exception 'Inviter must be the current user';
    end if;
    if new.invited_by is null and auth.uid() is not null then
      new.invited_by := (select auth.uid());
    end if;
    return new;
  end if;
  if new.invited_by is distinct from old.invited_by then
    raise exception 'Invitation attribution is immutable';
  end if;
  if tg_op = 'UPDATE' and new.role in ('owner', 'admin') and old.role not in ('owner', 'admin')
     and not private.has_workspace_role(new.workspace_id, array['owner']) then
    raise exception 'Only an existing owner can grant owner or admin privileges';
  end if;

  if tg_op = 'DELETE' then
    target_workspace := old.workspace_id;
    if old.role = 'owner' and old.status = 'active' then
      select count(*) into active_owners from public.workspace_memberships
      where workspace_id = target_workspace and role = 'owner' and status = 'active';
      if active_owners <= 1 then
        raise exception 'A workspace must retain at least one active owner';
      end if;
    end if;
    return old;
  end if;

  target_workspace := new.workspace_id;
  if tg_op = 'UPDATE' and old.role = 'owner' and old.status = 'active'
     and (new.role <> 'owner' or new.status <> 'active') then
    select count(*) into active_owners from public.workspace_memberships
    where workspace_id = target_workspace and role = 'owner' and status = 'active';
    if active_owners <= 1 then
      raise exception 'A workspace must retain at least one active owner';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function private.protect_membership_owner() from public, anon, authenticated;

create function private.guard_matching_result_update()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.workspace_id is distinct from old.workspace_id
     or new.mineral_opportunity_id is distinct from old.mineral_opportunity_id
     or new.buyer_requirement_id is distinct from old.buyer_requirement_id
     or new.score is distinct from old.score
     or new.score_explanation is distinct from old.score_explanation
     or new.algorithm_version is distinct from old.algorithm_version
     or new.generated_at is distinct from old.generated_at then
    raise exception 'Matching evidence is immutable; create a new result to preserve history';
  end if;
  if new.status is distinct from old.status then
    if not private.has_workspace_role(new.workspace_id, array['owner','admin','manager']) then
      raise exception 'Only workspace managers may review matching results';
    end if;
    if old.status <> 'suggested' or new.status not in ('reviewed', 'dismissed') then
      raise exception 'Invalid matching result status transition';
    end if;
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
  elsif new.reviewed_at is distinct from old.reviewed_at or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'Matching review metadata is managed by the review workflow';
  end if;
  return new;
end;
$function$;
revoke all on function private.guard_matching_result_update() from public, anon, authenticated;

create function private.guard_matching_result_insert()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status <> 'suggested' or new.reviewed_at is not null or new.reviewed_by is not null then
    raise exception 'Matching results must be created as suggested; review them separately';
  end if;
  return new;
end;
$function$;
revoke all on function private.guard_matching_result_insert() from public, anon, authenticated;

create function private.guard_introduction_insert()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if auth.uid() is null or new.initiated_by <> (select auth.uid()) then
    raise exception 'An introduction must be initiated by the signed-in workspace member';
  end if;
  if new.status <> 'draft' or new.introduced_at is not null then
    raise exception 'Introductions must be created as drafts and sent through the workflow';
  end if;
  if not exists (
    select 1 from public.matching_results mr
    where mr.workspace_id = new.workspace_id
      and mr.id = new.matching_result_id
      and mr.status = 'reviewed'
  ) then
    raise exception 'A reviewed matching result is required before creating an introduction';
  end if;
  return new;
end;
$function$;
revoke all on function private.guard_introduction_insert() from public, anon, authenticated;

create function private.guard_introduction_update()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.id is distinct from old.id
     or new.workspace_id is distinct from old.workspace_id
     or new.matching_result_id is distinct from old.matching_result_id
     or new.initiated_by is distinct from old.initiated_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Introduction identity and initiation details are immutable';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status in ('sent', 'withdrawn'))
      or (old.status = 'sent' and new.status in ('accepted', 'declined', 'withdrawn'))
      or (old.status = 'accepted' and new.status in ('completed', 'withdrawn'))
      or (old.status = 'declined' and new.status = 'withdrawn')
    ) then
      raise exception 'Invalid introduction status transition';
    end if;
    if old.status = 'draft' and new.status = 'sent' then
      new.introduced_at := now();
    else
      new.introduced_at := old.introduced_at;
    end if;
  elsif new.introduced_at is distinct from old.introduced_at then
    raise exception 'Introduction timestamp is managed by the status workflow';
  end if;
  return new;
end;
$function$;
revoke all on function private.guard_introduction_update() from public, anon, authenticated;

create function private.write_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  before_row jsonb;
  after_row jsonb;
  audit_workspace_id uuid;
  audit_record_id uuid;
  audit_record_key jsonb;
  audit_actor_id uuid;
  field_names text[];
begin
  audit_actor_id := (select auth.uid());
  if audit_actor_id is null
     and session_user <> 'postgres'
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Audit events require an authenticated or trusted administrative context';
  end if;
  if tg_op = 'INSERT' then
    after_row := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
  else
    before_row := to_jsonb(old);
  end if;

  audit_workspace_id := coalesce(
    nullif(coalesce(after_row, before_row)->>'workspace_id', '')::uuid,
    nullif(coalesce(after_row, before_row)->>'id', '')::uuid
  );
  audit_record_id := nullif(coalesce(after_row, before_row)->>'id', '')::uuid;
  audit_record_key := case
    when audit_record_id is not null then jsonb_build_object('id', audit_record_id)
    when tg_table_name in ('producer_profiles', 'buyer_profiles')
      then jsonb_build_object('organization_id', coalesce(after_row, before_row)->>'organization_id')
    when tg_table_name = 'meeting_attendees'
      then jsonb_build_object('meeting_id', coalesce(after_row, before_row)->>'meeting_id', 'contact_id', coalesce(after_row, before_row)->>'contact_id')
    when tg_table_name = 'workspace_memberships'
      then jsonb_build_object('user_id', coalesce(after_row, before_row)->>'user_id')
    else '{}'::jsonb
  end;
  if audit_workspace_id is null then
    raise exception 'Could not determine workspace for audit event on %', tg_table_name;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}') into field_names
    from jsonb_object_keys(after_row) as keys(k)
    where before_row->k is distinct from after_row->k
      and k not in ('updated_at');
  elsif tg_op = 'INSERT' then
    select coalesce(array_agg(k order by k), '{}') into field_names
    from jsonb_object_keys(after_row) as keys(k)
    where k not in ('created_at', 'updated_at');
  else
    select coalesce(array_agg(k order by k), '{}') into field_names
    from jsonb_object_keys(before_row) as keys(k)
    where k not in ('created_at', 'updated_at');
  end if;

  insert into public.audit_events (workspace_id, entity_type, record_id, record_key, action, changed_fields, actor_id)
  values (audit_workspace_id, tg_table_name, audit_record_id, audit_record_key, tg_op, field_names, audit_actor_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;
revoke all on function private.write_audit_event() from public, anon, authenticated;

-- Shared row timestamp handling.
do $block$
declare t text;
begin
  foreach t in array array[
    'workspaces','user_profiles','workspace_memberships','specification_definitions','organizations',
    'producer_profiles','buyer_profiles','mines','mineral_products','product_specifications',
    'mineral_opportunities','buyer_requirements','requirement_lines','requirement_specifications',
    'contacts','commercial_relationships','meetings','follow_ups','matching_results','introductions','documents'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end;
$block$;

create trigger product_specifications_validate before insert or update on public.product_specifications
for each row execute function private.validate_specification_value();
create trigger requirement_specifications_validate before insert or update on public.requirement_specifications
for each row execute function private.validate_specification_value();
create trigger opportunity_products_quantity_unit before insert or update on public.opportunity_products
for each row execute function private.validate_quantity_unit();
create trigger requirement_lines_quantity_unit before insert or update on public.requirement_lines
for each row execute function private.validate_quantity_unit();
create trigger organizations_verification_guard before insert or update on public.organizations
for each row execute function private.protect_organization_verification();
create trigger workspace_memberships_owner_guard before insert or update or delete on public.workspace_memberships
for each row execute function private.protect_membership_owner();
create trigger matching_results_insert_guard before insert on public.matching_results
for each row execute function private.guard_matching_result_insert();
create trigger matching_results_immutable_guard before update on public.matching_results
for each row execute function private.guard_matching_result_update();
create trigger introductions_insert_guard before insert on public.introductions
for each row execute function private.guard_introduction_insert();
create trigger introductions_update_guard before update on public.introductions
for each row execute function private.guard_introduction_update();

do $block$
declare t text;
begin
  foreach t in array array[
    'workspaces','specification_definitions','organizations','producer_profiles','buyer_profiles','mines',
    'mine_organization_roles','mineral_products','product_specifications','mineral_opportunities',
    'opportunity_products','buyer_requirements','requirement_lines','requirement_specifications','contacts',
    'contact_organizations','commercial_relationships','meetings','meeting_attendees','follow_ups',
    'matching_results','introductions','documents','document_links'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.prevent_workspace_identity_change()', t || '_identity_guard', t);
  end loop;
end;
$block$;

-- Creator attribution is bound to the authenticated actor; trusted service operations record NULL.
do $block$
declare r record;
begin
  for r in select * from (values
    ('workspaces','created_by',''),
    ('specification_definitions','created_by',''),
    ('organizations','created_by','updated_by'),
    ('mines','created_by','updated_by'),
    ('mine_organization_roles','created_by',''),
    ('mineral_products','created_by','updated_by'),
    ('mineral_opportunities','created_by','updated_by'),
    ('buyer_requirements','created_by','updated_by'),
    ('contacts','created_by','updated_by'),
    ('commercial_relationships','created_by','updated_by'),
    ('meetings','created_by','updated_by'),
    ('follow_ups','created_by','updated_by'),
    ('matching_results','created_by','updated_by'),
    ('documents','uploaded_by','')
  ) as actor_columns(table_name, creator_column, updater_column)
  loop
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function private.guard_actor_columns(%L, %L)',
      r.table_name || '_actor_guard', r.table_name, r.creator_column, r.updater_column
    );
  end loop;
end;
$block$;

-- RLS on all workspace-owned entities, plus controlled access to workspace/profile/catalogue tables.
alter table public.workspaces enable row level security;
alter table public.user_profiles enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.commodities enable row level security;
alter table public.units enable row level security;
alter table public.specification_definitions enable row level security;
alter table public.organization_verification_events enable row level security;

do $block$
declare t text;
begin
  foreach t in array array[
    'organizations','producer_profiles','buyer_profiles','mines',
    'mine_organization_roles','mineral_products','product_specifications','mineral_opportunities',
    'opportunity_products','buyer_requirements','requirement_lines','requirement_specifications',
    'contacts','contact_organizations','commercial_relationships','meetings','meeting_attendees',
    'follow_ups','matching_results','introductions','documents','document_links','audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$block$;

create policy workspaces_read_member on public.workspaces for select to authenticated
using (private.has_workspace_role(id));
create policy workspaces_update_admin on public.workspaces for update to authenticated
using (private.has_workspace_role(id, array['owner','admin']))
with check (private.has_workspace_role(id, array['owner','admin']));

create policy profiles_read_self_or_workspace_peer on public.user_profiles for select to authenticated
using (user_id = (select auth.uid()) or private.shares_workspace_with(user_id));
create policy profiles_update_self on public.user_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy memberships_read_self_or_admin on public.workspace_memberships for select to authenticated
using (user_id = (select auth.uid()) or private.has_workspace_role(workspace_id, array['owner','admin']));
create policy memberships_insert_admin on public.workspace_memberships for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['owner','admin'])
  and (role not in ('owner','admin') or private.has_workspace_role(workspace_id, array['owner']))
);
create policy memberships_update_admin on public.workspace_memberships for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin'])
  and (role <> 'owner' or private.has_workspace_role(workspace_id, array['owner']))
)
with check (
  private.has_workspace_role(workspace_id, array['owner','admin'])
  and (role not in ('owner','admin') or private.has_workspace_role(workspace_id, array['owner']))
);
create policy memberships_delete_admin on public.workspace_memberships for delete to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin'])
  and (role <> 'owner' or private.has_workspace_role(workspace_id, array['owner']))
);

create policy commodities_read_authenticated on public.commodities for select to authenticated using (true);
create policy units_read_authenticated on public.units for select to authenticated using (true);
create policy spec_definitions_read on public.specification_definitions for select to authenticated
using (workspace_id is null or private.has_workspace_role(workspace_id));
create policy spec_definitions_insert_manager on public.specification_definitions for insert to authenticated
with check (workspace_id is not null and private.has_workspace_role(workspace_id, array['owner','admin','manager']));
create policy spec_definitions_update_manager on public.specification_definitions for update to authenticated
using (workspace_id is not null and private.has_workspace_role(workspace_id, array['owner','admin','manager']))
with check (workspace_id is not null and private.has_workspace_role(workspace_id, array['owner','admin','manager']));
create policy spec_definitions_delete_manager on public.specification_definitions for delete to authenticated
using (workspace_id is not null and private.has_workspace_role(workspace_id, array['owner','admin']));

do $block$
declare t text;
begin
  foreach t in array array[
    'organizations','producer_profiles','buyer_profiles','mines','mine_organization_roles','mineral_products',
    'product_specifications','mineral_opportunities','opportunity_products','buyer_requirements','requirement_lines',
    'requirement_specifications','contacts','contact_organizations','commercial_relationships','meetings',
    'meeting_attendees','follow_ups'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.has_workspace_role(workspace_id))', t || '_read_member', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_role(workspace_id, array[''owner'',''admin'',''manager'',''contributor'']))', t || '_insert_editor', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_role(workspace_id, array[''owner'',''admin'',''manager'',''contributor''])) with check (private.has_workspace_role(workspace_id, array[''owner'',''admin'',''manager'',''contributor'']))', t || '_update_editor', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_role(workspace_id, array[''owner'',''admin'']))', t || '_delete_admin', t);
  end loop;
end;
$block$;

-- Matching evidence is append-only; reviewed status is the only permitted update. No delete policy is created.
create policy matching_results_read_member on public.matching_results for select to authenticated
using (private.has_workspace_role(workspace_id));
create policy matching_results_insert_editor on public.matching_results for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']));
create policy matching_results_update_editor on public.matching_results for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']))
with check (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']));

-- Introduction rows are explicit drafts tied to reviewed matches; no delete policy is created.
create policy introductions_read_member on public.introductions for select to authenticated
using (private.has_workspace_role(workspace_id));
create policy introductions_insert_editor on public.introductions for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']));
create policy introductions_update_editor on public.introductions for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']))
with check (private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']));

-- Document classification affects both metadata reads and the link records that reveal associations.
create policy documents_read_classified on public.documents for select to authenticated
using (
  private.has_workspace_role(workspace_id)
  and (
    classification = 'internal'
    or (classification = 'confidential' and private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor']))
    or (classification = 'restricted' and private.has_workspace_role(workspace_id, array['owner','admin','manager']))
  )
);
create policy documents_insert_editor on public.documents for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and (classification <> 'restricted' or private.has_workspace_role(workspace_id, array['owner','admin','manager']))
);
create policy documents_update_editor on public.documents for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and (classification <> 'restricted' or private.has_workspace_role(workspace_id, array['owner','admin','manager']))
)
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and (classification <> 'restricted' or private.has_workspace_role(workspace_id, array['owner','admin','manager']))
);

create policy document_links_read_classified on public.document_links for select to authenticated
using (
  private.has_workspace_role(workspace_id)
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
  )
);
create policy document_links_insert_editor on public.document_links for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
  )
);
create policy document_links_update_editor on public.document_links for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
  )
)
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager','contributor'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
  )
);
create policy document_links_delete_manager on public.document_links for delete to authenticated
using (
  private.has_workspace_role(workspace_id, array['owner','admin','manager'])
  and exists (
    select 1 from public.documents d
    where d.workspace_id = document_links.workspace_id
      and d.id = document_links.document_id
  )
);

drop policy if exists organization_verification_events_insert_editor on public.organization_verification_events;
drop policy if exists organization_verification_events_update_editor on public.organization_verification_events;
drop policy if exists organization_verification_events_delete_manager on public.organization_verification_events;
create policy organization_verification_events_read_member on public.organization_verification_events for select to authenticated
using (private.has_workspace_role(workspace_id));
create policy organization_verification_events_insert_manager on public.organization_verification_events for insert to authenticated
with check (
  private.has_workspace_role(workspace_id, array['owner','admin','manager'])
  and checked_by = (select auth.uid())
);

drop policy if exists audit_events_read_member on public.audit_events;
drop policy if exists audit_events_insert_editor on public.audit_events;
drop policy if exists audit_events_update_editor on public.audit_events;
drop policy if exists audit_events_delete_manager on public.audit_events;
create policy audit_events_read_manager on public.audit_events for select to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','manager']));

-- Database privileges are as important as row policies. anon receives no application data access.
revoke all on public.workspaces, public.user_profiles, public.workspace_memberships,
  public.commodities, public.units, public.specification_definitions,
  public.organizations, public.producer_profiles, public.buyer_profiles, public.organization_verification_events,
  public.mines, public.mine_organization_roles, public.mineral_products, public.product_specifications,
  public.mineral_opportunities, public.opportunity_products, public.buyer_requirements, public.requirement_lines,
  public.requirement_specifications, public.contacts, public.contact_organizations, public.commercial_relationships,
  public.meetings, public.meeting_attendees, public.follow_ups, public.matching_results, public.introductions,
  public.documents, public.document_links, public.audit_events
from anon, authenticated;

grant select, update on public.workspaces to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.workspace_memberships to authenticated;
grant select on public.commodities, public.units to authenticated;
grant select, insert, update, delete on public.specification_definitions to authenticated;
grant select, insert, update, delete on public.organizations, public.producer_profiles, public.buyer_profiles,
  public.mines, public.mine_organization_roles, public.mineral_products, public.product_specifications,
  public.mineral_opportunities, public.opportunity_products, public.buyer_requirements, public.requirement_lines,
  public.requirement_specifications, public.contacts, public.contact_organizations, public.commercial_relationships,
  public.meetings, public.meeting_attendees, public.follow_ups, public.matching_results, public.introductions,
  public.documents, public.document_links to authenticated;
grant select, insert on public.organization_verification_events to authenticated;
grant select on public.audit_events to authenticated;
revoke all on public.audit_events from service_role;

-- Append-only audit rows are written by the trigger function and cannot be forged or edited by users.
do $block$
declare t text;
begin
  foreach t in array array[
    'workspaces','workspace_memberships','organizations','producer_profiles','buyer_profiles','organization_verification_events',
    'mines','mine_organization_roles','mineral_products','product_specifications','mineral_opportunities',
    'opportunity_products','buyer_requirements','requirement_lines','requirement_specifications','contacts',
    'contact_organizations','commercial_relationships','meetings','meeting_attendees','follow_ups',
    'matching_results','introductions','documents','document_links'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.write_audit_event()', t || '_audit', t);
  end loop;
end;
$block$;

commit;

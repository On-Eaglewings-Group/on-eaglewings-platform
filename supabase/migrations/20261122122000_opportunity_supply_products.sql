begin;

alter table public.opportunity_products
  add column monthly_capacity numeric(24,8) check (monthly_capacity is null or monthly_capacity >= 0),
  add column monthly_capacity_unit_code text references public.units(code) on update restrict on delete restrict,
  add constraint opportunity_products_monthly_capacity_unit_check
    check ((monthly_capacity is null) = (monthly_capacity_unit_code is null));

alter table public.mineral_products
  add column export_available boolean;

-- Common assay and impurity fields are shared catalogue definitions, not
-- fabricated business records. Workspaces can add commodity-specific fields.
insert into public.specification_definitions (
  workspace_id, commodity_id, key, label, value_type, unit_code, description
)
select null, commodities.id, fields.key, fields.label, 'number', fields.unit_code, fields.description
from public.commodities
cross join (values
  ('grade_pct', 'Metal grade (%)', '%', 'Measured commodity grade.'),
  ('arsenic_ppm', 'Arsenic (ppm)', 'ppm', 'Arsenic assay value.'),
  ('lead_ppm', 'Lead (ppm)', 'ppm', 'Lead assay value.'),
  ('zinc_ppm', 'Zinc (ppm)', 'ppm', 'Zinc assay value.'),
  ('moisture_pct', 'Moisture (%)', '%', 'Moisture assay value.')
) as fields(key, label, unit_code, description)
on conflict do nothing;

create function public.add_opportunity_product(
  p_workspace_id uuid,
  p_opportunity_id uuid,
  p_commodity_id uuid,
  p_name text,
  p_product_form text,
  p_product_status text,
  p_export_available boolean,
  p_quantity_min numeric,
  p_quantity_max numeric,
  p_unit_code text,
  p_monthly_capacity numeric,
  p_monthly_capacity_unit_code text,
  p_currency_code text,
  p_indicative_price numeric,
  p_price_unit_code text,
  p_description text,
  p_specifications jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  supplier_organization_id uuid;
  opportunity_mine_id uuid;
  new_product_id uuid := gen_random_uuid();
  definition_record record;
  specification jsonb;
  specification_id uuid;
  numeric_value numeric;
  text_value text;
  boolean_value boolean;
  specification_unit_code text;
  unit_dimension text;
begin
  if actor_id is null or not private.has_workspace_role(p_workspace_id, array['owner','admin','manager','contributor']) then
    raise exception 'You do not have permission to add supply specifications.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 or length(p_name) > 200 then
    raise exception 'Enter a product name of 1 to 200 characters.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_specifications, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_specifications, '[]'::jsonb)) > 40 then
    raise exception 'Product specifications must be an array of at most 40 fields.' using errcode = '22023';
  end if;

  select source_organization_id, mine_id
  into supplier_organization_id, opportunity_mine_id
  from public.mineral_opportunities
  where workspace_id = p_workspace_id and id = p_opportunity_id and archived_at is null;
  if not found then
    raise exception 'Opportunity was not found in this workspace.' using errcode = 'P0002';
  end if;
  if supplier_organization_id is null then
    raise exception 'Add a supplier organization to the opportunity before recording products.' using errcode = '22023';
  end if;

  if p_unit_code is not null then
    select dimension into unit_dimension from public.units where code = p_unit_code;
    if unit_dimension is distinct from 'mass' then raise exception 'Offer quantity unit must measure mass.' using errcode = '22023'; end if;
  end if;
  if p_monthly_capacity_unit_code is not null then
    select dimension into unit_dimension from public.units where code = p_monthly_capacity_unit_code;
    if unit_dimension is distinct from 'mass' then raise exception 'Monthly capacity unit must measure mass.' using errcode = '22023'; end if;
  end if;
  if p_price_unit_code is not null then
    select dimension into unit_dimension from public.units where code = p_price_unit_code;
    if unit_dimension is distinct from 'mass' then raise exception 'Price unit must measure mass.' using errcode = '22023'; end if;
  end if;

  insert into public.mineral_products (
    id, workspace_id, producer_organization_id, mine_id, commodity_id, name,
    product_form, status, export_available, description, created_by, updated_by
  ) values (
    new_product_id, p_workspace_id, supplier_organization_id, opportunity_mine_id,
    p_commodity_id, btrim(p_name), p_product_form, p_product_status,
    p_export_available, nullif(btrim(p_description), ''), actor_id, actor_id
  );

  insert into public.opportunity_products (
    workspace_id, mineral_opportunity_id, mineral_product_id, quantity_min,
    quantity_max, unit_code, monthly_capacity, monthly_capacity_unit_code,
    currency_code, indicative_price, price_unit_code, notes
  ) values (
    p_workspace_id, p_opportunity_id, new_product_id, p_quantity_min,
    p_quantity_max, p_unit_code, p_monthly_capacity, p_monthly_capacity_unit_code,
    p_currency_code, p_indicative_price, p_price_unit_code, nullif(btrim(p_description), '')
  );

  for specification in select value from jsonb_array_elements(coalesce(p_specifications, '[]'::jsonb)) loop
    specification_id := (specification->>'definition_id')::uuid;
    select commodity_id, value_type, unit_code
    into definition_record
    from public.specification_definitions
    where id = specification_id
      and commodity_id = p_commodity_id
      and (workspace_id is null or workspace_id = p_workspace_id);
    if not found then raise exception 'A product specification does not belong to the selected commodity.' using errcode = '22023'; end if;

    numeric_value := nullif(specification->>'numeric_value', '')::numeric;
    text_value := nullif(btrim(specification->>'text_value'), '');
    boolean_value := case when nullif(specification->>'boolean_value', '') is null then null else (specification->>'boolean_value')::boolean end;
    specification_unit_code := nullif(specification->>'unit_code', '');

    if definition_record.value_type = 'number'
       and (numeric_value is null or specification_unit_code is distinct from definition_record.unit_code or text_value is not null or boolean_value is not null) then
      raise exception 'Numeric specifications must use the catalogue unit.' using errcode = '22023';
    elsif definition_record.value_type = 'text'
       and (text_value is null or specification_unit_code is not null or numeric_value is not null or boolean_value is not null) then
      raise exception 'Text specifications require a text value only.' using errcode = '22023';
    elsif definition_record.value_type = 'boolean'
       and (boolean_value is null or specification_unit_code is not null or numeric_value is not null or text_value is not null) then
      raise exception 'Boolean specifications require a true or false value only.' using errcode = '22023';
    end if;

    insert into public.product_specifications (
      workspace_id, mineral_product_id, commodity_id, specification_definition_id,
      numeric_value, text_value, boolean_value, unit_code, source
    ) values (
      p_workspace_id, new_product_id, p_commodity_id, specification_id,
      numeric_value, text_value, boolean_value, specification_unit_code, 'workspace_entry'
    );
  end loop;

  return new_product_id;
end;
$function$;

revoke all on function public.add_opportunity_product(uuid, uuid, uuid, text, text, text, boolean, numeric, numeric, text, numeric, text, text, numeric, text, text, jsonb) from public, anon;
grant execute on function public.add_opportunity_product(uuid, uuid, uuid, text, text, text, boolean, numeric, numeric, text, numeric, text, text, numeric, text, text, jsonb) to authenticated;

commit;

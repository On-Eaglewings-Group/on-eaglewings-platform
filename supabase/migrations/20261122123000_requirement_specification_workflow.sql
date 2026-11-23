begin;

-- Save one commodity line and its specification set atomically. Replacing the
-- set in one transaction permits a line's commodity to change without leaving
-- specifications attached to the former commodity.
create function public.save_requirement_line_with_specifications(
  p_workspace_id uuid,
  p_requirement_id uuid,
  p_line_id uuid,
  p_commodity_id uuid,
  p_product_form text,
  p_quantity_min numeric,
  p_quantity_max numeric,
  p_unit_code text,
  p_delivery_from date,
  p_delivery_until date,
  p_notes text,
  p_specifications jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  saved_line_id uuid := p_line_id;
  definition_record record;
  specification jsonb;
  definition_id uuid;
  specification_operator text;
  numeric_min_value numeric;
  numeric_max_value numeric;
  numeric_target_value numeric;
  text_value text;
  boolean_value boolean;
  specification_unit_code text;
begin
  if actor_id is null or not private.has_workspace_role(p_workspace_id, array['owner','admin','manager','contributor']) then
    raise exception 'You do not have permission to edit buyer requirements.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_specifications, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_specifications, '[]'::jsonb)) > 40 then
    raise exception 'Specifications must be an array of at most 40 values.' using errcode = '22023';
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    raise exception 'Commodity line notes must be 2,000 characters or fewer.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.buyer_requirements
    where id = p_requirement_id and workspace_id = p_workspace_id and archived_at is null
  ) then
    raise exception 'Buyer requirement was not found in this workspace.' using errcode = 'P0002';
  end if;

  if p_line_id is null then
    insert into public.requirement_lines (
      workspace_id, buyer_requirement_id, commodity_id, product_form,
      quantity_min, quantity_max, unit_code, delivery_from, delivery_until, notes
    ) values (
      p_workspace_id, p_requirement_id, p_commodity_id, p_product_form,
      p_quantity_min, p_quantity_max, p_unit_code, p_delivery_from, p_delivery_until, nullif(btrim(p_notes), '')
    ) returning id into saved_line_id;
  else
    perform 1 from public.requirement_lines
    where id = p_line_id and buyer_requirement_id = p_requirement_id and workspace_id = p_workspace_id
    for update;
    if not found then
      raise exception 'Commodity line was not found in this requirement.' using errcode = 'P0002';
    end if;

    delete from public.requirement_specifications
    where workspace_id = p_workspace_id and requirement_line_id = p_line_id;

    update public.requirement_lines
    set commodity_id = p_commodity_id,
        product_form = p_product_form,
        quantity_min = p_quantity_min,
        quantity_max = p_quantity_max,
        unit_code = p_unit_code,
        delivery_from = p_delivery_from,
        delivery_until = p_delivery_until,
        notes = nullif(btrim(p_notes), ''),
        updated_at = now()
    where id = p_line_id and buyer_requirement_id = p_requirement_id and workspace_id = p_workspace_id;
  end if;

  for specification in
    select item.value from jsonb_array_elements(coalesce(p_specifications, '[]'::jsonb)) as item(value)
  loop
    definition_id := (specification->>'definition_id')::uuid;
    select id, value_type, unit_code
    into definition_record
    from public.specification_definitions
    where id = definition_id
      and commodity_id = p_commodity_id
      and (workspace_id is null or workspace_id = p_workspace_id);
    if not found then
      raise exception 'A specification does not belong to the selected commodity.' using errcode = '22023';
    end if;

    specification_operator := coalesce(nullif(specification->>'operator', ''), 'range');
    numeric_min_value := nullif(specification->>'numeric_min', '')::numeric;
    numeric_max_value := nullif(specification->>'numeric_max', '')::numeric;
    numeric_target_value := nullif(specification->>'numeric_target', '')::numeric;
    text_value := nullif(btrim(specification->>'text_value'), '');
    boolean_value := case
      when nullif(specification->>'boolean_value', '') is null then null
      else (specification->>'boolean_value')::boolean
    end;
    specification_unit_code := nullif(specification->>'unit_code', '');

    if definition_record.value_type = 'number' then
      if specification_unit_code is distinct from definition_record.unit_code or text_value is not null or boolean_value is not null then
        raise exception 'Numeric buyer specifications must use the catalogue unit.' using errcode = '22023';
      end if;
    elsif definition_record.value_type = 'text' then
      if specification_unit_code is not null or numeric_min_value is not null or numeric_max_value is not null or numeric_target_value is not null or boolean_value is not null then
        raise exception 'Text buyer specifications require only a text value.' using errcode = '22023';
      end if;
    elsif definition_record.value_type = 'boolean' then
      if specification_unit_code is not null or numeric_min_value is not null or numeric_max_value is not null or numeric_target_value is not null or text_value is not null then
        raise exception 'Boolean buyer specifications require only a true or false value.' using errcode = '22023';
      end if;
    else
      raise exception 'Unsupported specification value type.' using errcode = '22023';
    end if;

    insert into public.requirement_specifications (
      workspace_id, requirement_line_id, commodity_id, specification_definition_id,
      operator, numeric_min, numeric_max, numeric_target, text_value, boolean_value, unit_code
    ) values (
      p_workspace_id, saved_line_id, p_commodity_id, definition_id,
      specification_operator, numeric_min_value, numeric_max_value, numeric_target_value,
      text_value, boolean_value, specification_unit_code
    );
  end loop;

  return saved_line_id;
end;
$function$;

revoke all on function public.save_requirement_line_with_specifications(uuid, uuid, uuid, uuid, text, numeric, numeric, text, date, date, text, jsonb) from public, anon;
grant execute on function public.save_requirement_line_with_specifications(uuid, uuid, uuid, uuid, text, numeric, numeric, text, date, date, text, jsonb) to authenticated;

create function public.delete_requirement_line_with_specifications(
  p_workspace_id uuid,
  p_requirement_id uuid,
  p_line_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null
     or not private.has_workspace_role(p_workspace_id, array['owner','admin','manager','contributor']) then
    raise exception 'You do not have permission to edit buyer requirements.' using errcode = '42501';
  end if;
  perform 1 from public.requirement_lines
  where id = p_line_id
    and buyer_requirement_id = p_requirement_id
    and workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception 'Commodity line was not found in this requirement.' using errcode = 'P0002';
  end if;
  delete from public.requirement_specifications
  where workspace_id = p_workspace_id and requirement_line_id = p_line_id;
  delete from public.requirement_lines
  where id = p_line_id
    and buyer_requirement_id = p_requirement_id
    and workspace_id = p_workspace_id;
end;
$function$;

revoke all on function public.delete_requirement_line_with_specifications(uuid, uuid, uuid) from public, anon;
grant execute on function public.delete_requirement_line_with_specifications(uuid, uuid, uuid) to authenticated;

create function public.delete_buyer_requirement_record(
  p_workspace_id uuid,
  p_requirement_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  requirement_exists boolean;
begin
  if actor_id is null or not private.has_workspace_role(p_workspace_id, array['owner','admin']) then
    raise exception 'Only workspace owners and administrators can delete buyer requirements.' using errcode = '42501';
  end if;
  perform 1 from public.buyer_requirements
  where id = p_requirement_id and workspace_id = p_workspace_id
  for update;
  requirement_exists := found;
  if not requirement_exists then
    raise exception 'Buyer requirement was not found in this workspace.' using errcode = 'P0002';
  end if;

  begin
    delete from public.requirement_specifications
    where workspace_id = p_workspace_id
      and requirement_line_id in (
        select id from public.requirement_lines
        where workspace_id = p_workspace_id and buyer_requirement_id = p_requirement_id
      );
    delete from public.requirement_lines
    where workspace_id = p_workspace_id and buyer_requirement_id = p_requirement_id;
    delete from public.buyer_requirements
    where workspace_id = p_workspace_id and id = p_requirement_id;
    return 'deleted';
  exception when foreign_key_violation then
    -- The subtransaction restores the lines/specifications before archiving,
    -- preserving evidence used by meetings, matches, documents or follow-ups.
    update public.buyer_requirements
    set archived_at = now(), updated_at = now()
    where workspace_id = p_workspace_id and id = p_requirement_id;
    return 'archived';
  end;
end;
$function$;

revoke all on function public.delete_buyer_requirement_record(uuid, uuid) from public, anon;
grant execute on function public.delete_buyer_requirement_record(uuid, uuid) to authenticated;

commit;

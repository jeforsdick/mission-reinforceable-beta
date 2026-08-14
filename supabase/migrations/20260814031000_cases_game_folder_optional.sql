do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cases'
      and column_name = 'game_folder'
  ) then
    alter table public.cases
      alter column game_folder drop not null;
  end if;
end
$$;

-- Align public intake storage with the request UUID used by intake notifications
-- and research-admin onboarding. Safe to apply after the equivalent manual fix.

alter table public.intake_requests
add column if not exists request_id uuid;

update public.intake_requests
set request_id = id
where request_id is null;

alter table public.intake_requests
alter column request_id set default gen_random_uuid();

alter table public.intake_requests
alter column request_id set not null;

create unique index if not exists intake_requests_request_id_key
on public.intake_requests (request_id);

comment on column public.intake_requests.request_id is
'Stable public-intake request UUID used by notification and research-admin workflows.';

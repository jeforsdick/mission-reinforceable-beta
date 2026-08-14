-- Add stable, case-scoped identifiers for fidelity targets.
-- Existing rows intentionally retain NULL keys until an administrator backfills them.

alter table public.fidelity_targets
add column target_key text;

-- PostgreSQL unique indexes permit multiple NULL values, preserving existing rows,
-- while rejecting duplicate non-NULL keys within the same case.
create unique index fidelity_targets_case_id_target_key_key
on public.fidelity_targets (case_id, target_key);

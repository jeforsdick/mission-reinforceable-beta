-- Keep the protected game publisher unavailable to anonymous callers.
revoke all on function public.research_admin_publish_game_draft(uuid,jsonb) from anon, public;
grant execute on function public.research_admin_publish_game_draft(uuid,jsonb) to authenticated;

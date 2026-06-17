-- Alter tables to use REPLICA IDENTITY FULL so UPDATE replication payloads include all columns,
-- enabling Supabase Realtime postgres_changes filters (e.g. room_id=eq.UUID) to match on updates.
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.round_players REPLICA IDENTITY FULL;

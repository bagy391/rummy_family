-- Migration to support voice chat enablement toggling by the room host.
-- Adds voice_chat_enabled column to public.rooms table.

ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS voice_chat_enabled boolean DEFAULT true NOT NULL;

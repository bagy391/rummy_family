-- Drop old and new policies on room_players (ensuring idempotency)
DROP POLICY IF EXISTS "Players can update their own status or admins can update any status" ON public.room_players;
DROP POLICY IF EXISTS "Players can update status or admins can update any status" ON public.room_players;
DROP POLICY IF EXISTS "Players can leave rooms" ON public.room_players;
DROP POLICY IF EXISTS "Players can leave rooms or admin can kick" ON public.room_players;
DROP POLICY IF EXISTS "Users can insert themselves into a room" ON public.room_players;

-- Create kicked_players table to track who has been kicked from which room
CREATE TABLE IF NOT EXISTS public.kicked_players (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    kicked_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(room_id, player_id)
);

-- Enable RLS on kicked_players
ALTER TABLE public.kicked_players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on kicked_players to make script idempotent
DROP POLICY IF EXISTS "Users can check if they are kicked" ON public.kicked_players;
DROP POLICY IF EXISTS "Admins can kick players" ON public.kicked_players;

-- Create policies on kicked_players
CREATE POLICY "Users can check if they are kicked" ON public.kicked_players
    FOR SELECT USING (
        auth.uid() = player_id OR
        public.is_room_admin(room_id, auth.uid())
    );

CREATE POLICY "Admins can kick players" ON public.kicked_players
    FOR INSERT WITH CHECK (
        public.is_room_admin(room_id, auth.uid())
    );

-- Create new update policy on room_players
-- Allows players to update their own status, admins to update any status, and other players in the room to ONLY set status to 'disconnected'
CREATE POLICY "Players can update status or admins can update any status" ON public.room_players
    FOR UPDATE USING (
        auth.uid() = player_id OR
        public.is_room_admin(room_id, auth.uid()) OR
        public.is_player_in_room(room_id, auth.uid())
    )
    WITH CHECK (
        auth.uid() = player_id OR
        public.is_room_admin(room_id, auth.uid()) OR
        (
            public.is_player_in_room(room_id, auth.uid()) AND
            status = 'disconnected'
        )
    );

-- Create new delete policy on room_players
-- Allows players to leave the room themselves, and room admins to delete (kick) any player in the room
CREATE POLICY "Players can leave rooms or admin can kick" ON public.room_players
    FOR DELETE USING (
        auth.uid() = player_id OR
        public.is_room_admin(room_id, auth.uid())
    );

-- Create new insert policy on room_players preventing kicked users from joining
CREATE POLICY "Users can insert themselves into a room" ON public.room_players
    FOR INSERT WITH CHECK (
        auth.uid() = player_id AND
        NOT EXISTS (
            SELECT 1 FROM public.kicked_players
            WHERE kicked_players.room_id = room_players.room_id AND kicked_players.player_id = auth.uid()
        )
    );

-- Set REPLICA IDENTITY FULL on room_players so that DELETE events include room_id for Realtime filters
ALTER TABLE public.room_players REPLICA IDENTITY FULL;

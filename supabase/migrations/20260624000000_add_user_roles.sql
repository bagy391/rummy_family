-- Add role column to profiles table with default 'player'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'host', 'admin'));

-- Update rooms table insert policy: only hosts and admins can create rooms
DROP POLICY IF EXISTS "Users can join rooms" ON public.rooms;

CREATE POLICY "Only hosts and admins can create rooms" ON public.rooms
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
              AND (profiles.role = 'host' OR profiles.role = 'admin')
        )
    );

-- Allow authenticated users to insert their own initial game_stats row if missing
DROP POLICY IF EXISTS "Users can insert their own game stats" ON public.game_stats;

CREATE POLICY "Users can insert their own game stats" ON public.game_stats
    FOR INSERT WITH CHECK (auth.uid() = player_id);

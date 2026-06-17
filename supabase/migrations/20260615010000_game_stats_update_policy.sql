-- Drop policy if exists (idempotency)
DROP POLICY IF EXISTS "Authenticated users can update game stats" ON public.game_stats;

-- Create update policy for game_stats table to allow authenticated users to update player statistics
CREATE POLICY "Authenticated users can update game stats" ON public.game_stats
    FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

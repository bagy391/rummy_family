-- Recalculate game_stats for all profiles based on finished rooms and payment records
INSERT INTO public.game_stats (player_id, total_games_played, total_wins, total_points, earnings, updated_at)
SELECT 
    p.id AS player_id,
    -- Total games played: rooms where they participated and status is finished
    COALESCE((
        SELECT COUNT(*)::integer 
        FROM public.room_players rp
        JOIN public.rooms r ON r.id = rp.room_id
        WHERE rp.player_id = p.id AND r.status = 'finished'
    ), 0) AS total_games_played,
    -- Total wins: rooms where status is finished and their status was not 'eliminated'
    COALESCE((
        SELECT COUNT(*)::integer 
        FROM public.room_players rp
        JOIN public.rooms r ON r.id = rp.room_id
        WHERE rp.player_id = p.id AND r.status = 'finished' AND rp.status != 'eliminated'
    ), 0) AS total_wins,
    -- Total points: sum of total_score in room_players for finished rooms
    COALESCE((
        SELECT SUM(rp.total_score)::integer 
        FROM public.room_players rp
        JOIN public.rooms r ON r.id = rp.room_id
        WHERE rp.player_id = p.id AND r.status = 'finished'
    ), 0) AS total_points,
    -- Earnings: sum of completed payments where they were the payee minus where they were the payer
    (
        COALESCE((SELECT SUM(amount) FROM public.payment_records WHERE payee_id = p.id AND status = 'completed'), 0) -
        COALESCE((SELECT SUM(amount) FROM public.payment_records WHERE payer_id = p.id AND status = 'completed'), 0)
    ) AS earnings,
    now() AS updated_at
FROM public.profiles p
ON CONFLICT (player_id) DO UPDATE SET
    total_games_played = EXCLUDED.total_games_played,
    total_wins = EXCLUDED.total_wins,
    total_points = EXCLUDED.total_points,
    earnings = EXCLUDED.earnings,
    updated_at = EXCLUDED.updated_at;

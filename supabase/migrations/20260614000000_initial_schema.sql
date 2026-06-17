-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    mobile_number text,
    age integer,
    sex text,
    avatar_url text,
    upi_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger for updating profiles.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code text NOT NULL UNIQUE,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    bet_amount numeric NOT NULL DEFAULT 0,
    current_round_number integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 3. Room Players Table
CREATE TABLE IF NOT EXISTS public.room_players (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seat_position integer NOT NULL,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'eliminated', 'spectating', 'disconnected')),
    is_admin boolean NOT NULL DEFAULT false,
    total_score integer NOT NULL DEFAULT 0,
    opted_leave_share boolean NOT NULL DEFAULT false,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    disconnected_at timestamp with time zone,
    UNIQUE(room_id, player_id),
    UNIQUE(room_id, seat_position)
);

-- Enable RLS on room_players
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- Room Policies
CREATE POLICY "Users can view rooms they are in" ON public.rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_players.room_id = rooms.id AND room_players.player_id = auth.uid()
        ) OR created_by = auth.uid() OR status = 'waiting'
    );

CREATE POLICY "Users can join rooms" ON public.rooms
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Room admins can update rooms" ON public.rooms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = rooms.id AND room_players.player_id = auth.uid() AND room_players.is_admin = true
        ) OR created_by = auth.uid()
    );

-- Room Players Policies
CREATE OR REPLACE FUNCTION public.is_player_in_room(p_room_id uuid, p_player_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.room_players
        WHERE room_id = p_room_id AND player_id = p_player_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_room_admin(p_room_id uuid, p_player_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.room_players
        WHERE room_id = p_room_id AND player_id = p_player_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_room_waiting(p_room_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.rooms
        WHERE id = p_room_id AND status = 'waiting'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "View room players in same room" ON public.room_players
    FOR SELECT USING (
        public.is_player_in_room(room_id, auth.uid()) OR 
        public.is_room_waiting(room_id)
    );

CREATE POLICY "Users can insert themselves into a room" ON public.room_players
    FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own status or admins can update any status" ON public.room_players
    FOR UPDATE USING (
        auth.uid() = player_id OR
        public.is_room_admin(room_id, auth.uid())
    );

CREATE POLICY "Players can leave rooms" ON public.room_players
    FOR DELETE USING (auth.uid() = player_id);

-- 4. Rounds Table
CREATE TABLE IF NOT EXISTS public.rounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    round_number integer NOT NULL,
    status text NOT NULL DEFAULT 'dealing' CHECK (status IN ('dealing', 'active', 'completed')),
    current_turn_player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    turn_order_index integer NOT NULL DEFAULT 0,
    wild_joker jsonb, -- WildJokerInfo: { card, wildRank }
    draw_pile jsonb NOT NULL, -- Private deck sequence
    discard_pile jsonb NOT NULL, -- Public discard pile
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    UNIQUE(room_id, round_number)
);

-- Enable RLS on rounds
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view rounds" ON public.rounds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = rounds.room_id AND room_players.player_id = auth.uid()
        )
    );

CREATE POLICY "Room admins can insert rounds" ON public.rounds
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = rounds.room_id AND room_players.player_id = auth.uid() AND room_players.is_admin = true
        )
    );

CREATE POLICY "Room members/admins can update rounds" ON public.rounds
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = rounds.room_id AND room_players.player_id = auth.uid()
        )
    );

-- 5. Round Players Table
CREATE TABLE IF NOT EXISTS public.round_players (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
    player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped_first', 'dropped_second', 'shown_wrong', 'shown_valid', 'winner')),
    hand jsonb NOT NULL, -- Private card array
    score_this_round integer,
    seat_position integer NOT NULL,
    has_drawn_this_turn boolean NOT NULL DEFAULT false,
    UNIQUE(round_id, player_id)
);

-- Enable RLS on round_players
ALTER TABLE public.round_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own round player record" ON public.round_players
    FOR SELECT USING (
        player_id = auth.uid() OR
        EXISTS (
            -- Let other players see non-hand info after round completion or during play
            SELECT 1 FROM public.rounds r
            WHERE r.id = round_players.round_id AND r.status = 'completed'
        )
    );

CREATE POLICY "Room admins can insert round players" ON public.round_players
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            JOIN public.rounds r ON r.room_id = rp.room_id
            WHERE r.id = round_players.round_id AND rp.player_id = auth.uid() AND rp.is_admin = true
        )
    );

CREATE POLICY "Players can update their own round player record or admin can update any" ON public.round_players
    FOR UPDATE USING (
        player_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.room_players rp
            JOIN public.rounds r ON r.room_id = rp.room_id
            WHERE r.id = round_players.round_id AND rp.player_id = auth.uid() AND rp.is_admin = true
        )
    );

-- Separate policy for viewing only metadata (non-hand) of other round players
CREATE OR REPLACE VIEW public.round_player_metadata AS
SELECT id, round_id, player_id, status, score_this_round, seat_position, has_drawn_this_turn
FROM public.round_players;

-- 6. Game Events Table (Event Sourcing)
CREATE TABLE IF NOT EXISTS public.game_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    sequence_number integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on game_events
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view game events" ON public.game_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = game_events.room_id AND room_players.player_id = auth.uid()
        )
    );

CREATE POLICY "Room members can insert game events" ON public.game_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = game_events.room_id AND room_players.player_id = auth.uid()
        )
    );

-- 7. Payment Records Table
CREATE TABLE IF NOT EXISTS public.payment_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    payer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    payee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    UNIQUE(room_id, payer_id, payee_id)
);

-- Enable RLS on payment_records
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view payment records involving them" ON public.payment_records
    FOR SELECT USING (
        payer_id = auth.uid() OR payee_id = auth.uid()
    );

CREATE POLICY "Room members can insert payment records" ON public.payment_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = payment_records.room_id AND room_players.player_id = auth.uid()
        )
    );

CREATE POLICY "Payees can update payment confirmations" ON public.payment_records
    FOR UPDATE USING (
        payee_id = auth.uid()
    );

-- 8. Game Stats & Leaderboard View
CREATE TABLE IF NOT EXISTS public.game_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    total_games_played integer NOT NULL DEFAULT 0,
    total_wins integer NOT NULL DEFAULT 0,
    total_points integer NOT NULL DEFAULT 0,
    earnings numeric NOT NULL DEFAULT 0, -- Net earnings
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game stats are viewable by everyone" ON public.game_stats
    FOR SELECT USING (true);


-- ==========================================
-- ATOMIC GAME ACTION STORED PROCEDURES (RPCs)
-- ==========================================

-- RPC 1: DRAW CARD FROM PILE
CREATE OR REPLACE FUNCTION public.draw_card_from_pile(
    p_round_id uuid,
    p_player_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_draw_pile jsonb;
    v_drawn_card jsonb;
    v_new_draw_pile jsonb;
    v_hand jsonb;
    v_new_hand jsonb;
    v_current_turn_player_id uuid;
    v_status text;
    v_has_drawn_this_turn boolean;
    v_room_id uuid;
    v_seq_num integer;
BEGIN
    -- Acquire transaction advisory lock on round to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext(p_round_id::text));

    -- Get round & room info
    SELECT room_id, current_turn_player_id, status, draw_pile
    INTO v_room_id, v_current_turn_player_id, v_status, v_draw_pile
    FROM public.rounds
    WHERE id = p_round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Round not found';
    END IF;

    IF v_status != 'active' THEN
        RAISE EXCEPTION 'Round is not active';
    END IF;

    IF v_current_turn_player_id != p_player_id THEN
        RAISE EXCEPTION 'It is not your turn';
    END IF;

    -- Check if player has already drawn
    SELECT has_drawn_this_turn, hand
    INTO v_has_drawn_this_turn, v_hand
    FROM public.round_players
    WHERE round_id = p_round_id AND player_id = p_player_id;

    IF v_has_drawn_this_turn THEN
        RAISE EXCEPTION 'You have already drawn a card this turn';
    END IF;

    -- Verify draw pile is not empty
    IF jsonb_array_length(v_draw_pile) = 0 THEN
        RAISE EXCEPTION 'Draw pile is empty';
    END IF;

    -- Pop the first card (index 0)
    v_drawn_card := v_draw_pile -> 0;
    
    -- Construct new draw pile
    SELECT jsonb_agg(elem)
    INTO v_new_draw_pile
    FROM (
        SELECT elem 
        FROM jsonb_array_elements(v_draw_pile) WITH ORDINALITY AS t(elem, idx)
        WHERE idx > 1
    ) AS sub;

    IF v_new_draw_pile IS NULL THEN
        v_new_draw_pile := '[]'::jsonb;
    END IF;

    -- Append card to player hand
    v_new_hand := v_hand || v_drawn_card;

    -- Update round players
    UPDATE public.round_players
    SET hand = v_new_hand, has_drawn_this_turn = true
    WHERE round_id = p_round_id AND player_id = p_player_id;

    -- Update rounds pile
    UPDATE public.rounds
    SET draw_pile = v_new_draw_pile
    WHERE id = p_round_id;

    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number) + 1, 1)
    INTO v_seq_num
    FROM public.game_events
    WHERE round_id = p_round_id;

    -- Insert game event
    INSERT INTO public.game_events (round_id, room_id, player_id, sequence_number, event_type, event_data)
    VALUES (
        p_round_id, 
        v_room_id, 
        p_player_id, 
        v_seq_num, 
        'CARD_DRAWN_FROM_PILE', 
        jsonb_build_object('cardId', v_drawn_card ->> 'id')
    );

    RETURN v_drawn_card;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 2: PICK CARD FROM DISCARD PILE
CREATE OR REPLACE FUNCTION public.pick_card_from_discard(
    p_round_id uuid,
    p_player_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_discard_pile jsonb;
    v_picked_card jsonb;
    v_new_discard_pile jsonb;
    v_hand jsonb;
    v_new_hand jsonb;
    v_current_turn_player_id uuid;
    v_status text;
    v_has_drawn_this_turn boolean;
    v_room_id uuid;
    v_seq_num integer;
    v_len integer;
BEGIN
    -- Acquire transaction advisory lock on round
    PERFORM pg_advisory_xact_lock(hashtext(p_round_id::text));

    -- Get round & room info
    SELECT room_id, current_turn_player_id, status, discard_pile
    INTO v_room_id, v_current_turn_player_id, v_status, v_discard_pile
    FROM public.rounds
    WHERE id = p_round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Round not found';
    END IF;

    IF v_status != 'active' THEN
        RAISE EXCEPTION 'Round is not active';
    END IF;

    IF v_current_turn_player_id != p_player_id THEN
        RAISE EXCEPTION 'It is not your turn';
    END IF;

    -- Check if player has already drawn
    SELECT has_drawn_this_turn, hand
    INTO v_has_drawn_this_turn, v_hand
    FROM public.round_players
    WHERE round_id = p_round_id AND player_id = p_player_id;

    IF v_has_drawn_this_turn THEN
        RAISE EXCEPTION 'You have already drawn a card this turn';
    END IF;

    -- Verify discard pile is not empty
    v_len := jsonb_array_length(v_discard_pile);
    IF v_len = 0 THEN
        RAISE EXCEPTION 'Discard pile is empty';
    END IF;

    -- Pop the last card (index len - 1)
    v_picked_card := v_discard_pile -> (v_len - 1);
    
    -- Construct new discard pile
    SELECT jsonb_agg(elem)
    INTO v_new_discard_pile
    FROM (
        SELECT elem 
        FROM jsonb_array_elements(v_discard_pile) WITH ORDINALITY AS t(elem, idx)
        WHERE idx < v_len
    ) AS sub;

    IF v_new_discard_pile IS NULL THEN
        v_new_discard_pile := '[]'::jsonb;
    END IF;

    -- Append card to player hand
    v_new_hand := v_hand || v_picked_card;

    -- Update round players
    UPDATE public.round_players
    SET hand = v_new_hand, has_drawn_this_turn = true
    WHERE round_id = p_round_id AND player_id = p_player_id;

    -- Update rounds pile
    UPDATE public.rounds
    SET discard_pile = v_new_discard_pile
    WHERE id = p_round_id;

    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number) + 1, 1)
    INTO v_seq_num
    FROM public.game_events
    WHERE round_id = p_round_id;

    -- Insert game event
    INSERT INTO public.game_events (round_id, room_id, player_id, sequence_number, event_type, event_data)
    VALUES (
        p_round_id, 
        v_room_id, 
        p_player_id, 
        v_seq_num, 
        'CARD_DRAWN_FROM_DISCARD', 
        jsonb_build_object('card', v_picked_card)
    );

    RETURN v_picked_card;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 3: DISCARD CARD
CREATE OR REPLACE FUNCTION public.discard_card(
    p_round_id uuid,
    p_player_id uuid,
    p_card_id text,
    p_next_player_id uuid
) RETURNS void AS $$
DECLARE
    v_discard_pile jsonb;
    v_hand jsonb;
    v_new_hand jsonb;
    v_discarded_card jsonb;
    v_current_turn_player_id uuid;
    v_status text;
    v_has_drawn_this_turn boolean;
    v_room_id uuid;
    v_seq_num integer;
    v_card_found boolean := false;
BEGIN
    -- Acquire transaction advisory lock on round
    PERFORM pg_advisory_xact_lock(hashtext(p_round_id::text));

    -- Get round & room info
    SELECT room_id, current_turn_player_id, status, discard_pile
    INTO v_room_id, v_current_turn_player_id, v_status, v_discard_pile
    FROM public.rounds
    WHERE id = p_round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Round not found';
    END IF;

    IF v_status != 'active' THEN
        RAISE EXCEPTION 'Round is not active';
    END IF;

    IF v_current_turn_player_id != p_player_id THEN
        RAISE EXCEPTION 'It is not your turn';
    END IF;

    -- Check if player has drawn
    SELECT has_drawn_this_turn, hand
    INTO v_has_drawn_this_turn, v_hand
    FROM public.round_players
    WHERE round_id = p_round_id AND player_id = p_player_id;

    IF NOT v_has_drawn_this_turn THEN
        RAISE EXCEPTION 'You must draw a card before discarding';
    END IF;

    -- Remove card from hand
    SELECT jsonb_agg(elem)
    INTO v_new_hand
    FROM jsonb_array_elements(v_hand) AS elem
    WHERE elem ->> 'id' != p_card_id;

    -- Check if card was actually in hand (length should decrease by exactly 1)
    IF jsonb_array_length(v_new_hand) = jsonb_array_length(v_hand) THEN
        RAISE EXCEPTION 'Card not found in player hand';
    END IF;

    -- Find the discarded card details
    SELECT elem INTO v_discarded_card
    FROM jsonb_array_elements(v_hand) AS elem
    WHERE elem ->> 'id' = p_card_id;

    -- Append discarded card to discard pile
    v_discard_pile := v_discard_pile || v_discarded_card;

    -- Update round players (set has_drawn_this_turn = false for next turn)
    UPDATE public.round_players
    SET hand = v_new_hand, has_drawn_this_turn = false
    WHERE round_id = p_round_id AND player_id = p_player_id;

    -- Update rounds pile, set next player turn
    UPDATE public.rounds
    SET discard_pile = v_discard_pile,
        current_turn_player_id = p_next_player_id,
        turn_order_index = turn_order_index + 1
    WHERE id = p_round_id;

    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number) + 1, 1)
    INTO v_seq_num
    FROM public.game_events
    WHERE round_id = p_round_id;

    -- Insert game event
    INSERT INTO public.game_events (round_id, room_id, player_id, sequence_number, event_type, event_data)
    VALUES (
        p_round_id, 
        v_room_id, 
        p_player_id, 
        v_seq_num, 
        'CARD_DISCARDED', 
        jsonb_build_object('card', v_discarded_card)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- TRIGGER FOR CREATING PROFILE ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, upi_id, mobile_number, age, sex)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data ->> 'upi_id',
        new.raw_user_meta_data ->> 'mobile_number',
        (new.raw_user_meta_data ->> 'age')::integer,
        new.raw_user_meta_data ->> 'sex'
    );
    
    -- Initialize game statistics
    INSERT INTO public.game_stats (player_id)
    VALUES (new.id);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime for gameplay tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_players;


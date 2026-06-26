-- Migration to support closed deck reshuffling when the draw pile becomes empty.
-- Replaces the public.draw_card_from_pile function to shuffle the discard pile (excluding the top card) into the draw pile when needed.

CREATE OR REPLACE FUNCTION public.draw_card_from_pile(
    p_round_id uuid,
    p_player_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_draw_pile jsonb;
    v_discard_pile jsonb;
    v_top_discard_card jsonb;
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
    SELECT room_id, current_turn_player_id, status, draw_pile, discard_pile
    INTO v_room_id, v_current_turn_player_id, v_status, v_draw_pile, v_discard_pile
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

    -- If draw pile is empty, attempt to reshuffle discard pile (excluding the top card) into draw pile
    IF jsonb_array_length(v_draw_pile) = 0 THEN
        IF jsonb_array_length(v_discard_pile) <= 1 THEN
            RAISE EXCEPTION 'Draw pile is empty and discard pile has no extra cards to shuffle';
        END IF;

        -- Get top card of discard pile (last element)
        v_top_discard_card := v_discard_pile -> (jsonb_array_length(v_discard_pile) - 1);

        -- Shuffle remaining discard pile cards to form new draw pile
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        INTO v_draw_pile
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_discard_pile) WITH ORDINALITY AS t(elem, idx)
            WHERE idx < jsonb_array_length(v_discard_pile)
            ORDER BY random()
        ) AS sub;

        -- New discard pile contains only the top card
        v_discard_pile := jsonb_build_array(v_top_discard_card);

        -- Save back to database immediately before drawing
        UPDATE public.rounds
        SET draw_pile = v_draw_pile,
            discard_pile = v_discard_pile
        WHERE id = p_round_id;
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
        'draw_pile', 
        jsonb_build_object('card', v_drawn_card)
    );

    RETURN v_drawn_card;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

BEGIN;
-- A fixed charge per takeaway order, inclusive of any applicable packing tax.
-- Default zero avoids imposing an unapproved charge; configure in Settings.
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS parcel_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (parcel_charge >= 0);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parcel_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (parcel_charge >= 0);
CREATE OR REPLACE FUNCTION public.save_restaurant_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF NOT public.auth_has_permission('settings.manage') THEN
        RAISE EXCEPTION 'Permission denied: settings.manage is required' USING ERRCODE = '42501';
    END IF;
    IF p_settings ? 'home_content' AND (
        jsonb_typeof(p_settings->'home_content') IS DISTINCT FROM 'object'
        OR EXISTS (SELECT 1 FROM jsonb_each(p_settings->'home_content') WHERE jsonb_typeof(value) <> 'string')
    ) THEN RAISE EXCEPTION 'Home content must contain text fields only'; END IF;
    SELECT to_jsonb(s) INTO v_old FROM public.restaurant_settings s WHERE id = 1 FOR UPDATE;
    UPDATE public.restaurant_settings SET
        parcel_charge = COALESCE((p_settings->>'parcel_charge')::NUMERIC, parcel_charge),
        home_content = COALESCE(p_settings->'home_content', home_content),
        restaurant_name = trim(p_settings->>'restaurant_name'),
        opening_hours = COALESCE(p_settings->>'opening_hours', opening_hours),
        tagline = p_settings->>'tagline',
        tagline_kn = p_settings->>'tagline_kn',
        address = p_settings->>'address',
        phone = p_settings->>'phone',
        upi_vpa = p_settings->>'upi_vpa',
        token_prefix = trim(p_settings->>'token_prefix'),
        gst_rate = (p_settings->>'gst_rate')::NUMERIC,
        thermal_width = p_settings->>'thermal_width',
        updated_at = NOW(), updated_by = auth.uid()
    WHERE id = 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant settings have not been initialized'; END IF;
    SELECT to_jsonb(s) INTO v_new FROM public.restaurant_settings s WHERE id = 1;
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, old_values, new_values)
    VALUES (auth.uid(), (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
        'SETTINGS_UPDATED', 'SETTING', v_old, v_new);
END;
$$;
CREATE OR REPLACE FUNCTION public.get_public_restaurant_profile()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'restaurant_name', restaurant_name, 'tagline', tagline,
        'tagline_kn', tagline_kn, 'address', address,
        'phone', phone, 'opening_hours', opening_hours, 'home_content', home_content, 'parcel_charge', parcel_charge
    )
    FROM public.restaurant_settings WHERE id = 1;
$$;
CREATE OR REPLACE FUNCTION public.create_order_with_token(
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_order_type TEXT,
    p_table_number TEXT,
    p_subtotal DECIMAL,
    p_tax_amount DECIMAL,
    p_total_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_seq INT;
    v_token_str TEXT;
    v_tracking_token TEXT;
    v_order_id UUID;
    v_customer_id UUID := auth.uid();
    v_item JSONB;
    v_menu_item public.menu_items%ROWTYPE;
    v_quantity INT;
    v_subtotal NUMERIC(10,2) := 0;
    v_tax_amount NUMERIC(10,2);
    v_parcel_charge NUMERIC(10,2) := 0;
    v_total_amount NUMERIC(10,2);
    v_max_prep INT := 10;
BEGIN
    IF NULLIF(trim(p_customer_name), '') IS NULL OR length(regexp_replace(COALESCE(p_customer_mobile, ''), '[^0-9]', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'Customer name and a valid mobile number are required' USING ERRCODE = '22023';
    END IF;
    IF p_order_type NOT IN ('DINE_IN', 'TAKEAWAY') OR p_payment_method NOT IN ('UPI', 'CASH') THEN
        RAISE EXCEPTION 'Invalid order type or payment method' USING ERRCODE = '22023';
    END IF;
    IF p_payment_status IS DISTINCT FROM 'PENDING' THEN
        RAISE EXCEPTION 'Invalid payment status' USING ERRCODE = '22023';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
        RAISE EXCEPTION 'An order must contain between 1 and 100 items' USING ERRCODE = '22023';
    END IF;

    -- Validate availability and calculate totals from current database menu prices.
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE(v_item->>'menu_item_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'Invalid menu item reference' USING ERRCODE = '22023';
        END IF;
        v_quantity := (v_item->>'quantity')::INT;
        IF v_quantity < 1 OR v_quantity > 100 THEN
            RAISE EXCEPTION 'Item quantity must be between 1 and 100' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A selected menu item is unavailable' USING ERRCODE = '22023';
        END IF;
        v_subtotal := v_subtotal + (v_menu_item.price * v_quantity);
        v_max_prep := GREATEST(v_max_prep, COALESCE(v_menu_item.preparation_time_minutes, 10));
    END LOOP;
    v_tax_amount := round(v_subtotal * 0.05, 2);
    IF p_order_type = 'TAKEAWAY' THEN
        SELECT parcel_charge INTO STRICT v_parcel_charge FROM public.restaurant_settings WHERE id = 1;
    END IF;
    v_total_amount := v_subtotal + v_tax_amount + v_parcel_charge;

    INSERT INTO public.daily_token_sequences (token_date, last_sequence)
    VALUES (v_today, 1)
    ON CONFLICT (token_date)
    DO UPDATE SET last_sequence = daily_token_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    v_token_str := 'DP-' || LPAD(v_seq::TEXT, 3, '0');
    v_tracking_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO public.orders (
        token_number, token_date, tracking_token, customer_id, customer_name,
        customer_mobile, order_type, table_number, subtotal, tax_amount,
        total_amount, parcel_charge, payment_method, payment_status, order_status, notes,
        estimated_prep_time_minutes
    ) VALUES (
        v_token_str, v_today, v_tracking_token, v_customer_id, trim(p_customer_name),
        regexp_replace(p_customer_mobile, '[^0-9]', '', 'g'), p_order_type,
        CASE WHEN p_order_type = 'DINE_IN' THEN NULLIF(trim(p_table_number), '') ELSE NULL END,
        v_subtotal, v_tax_amount, v_total_amount, v_parcel_charge, p_payment_method, 'PENDING',
        'PLACED', NULLIF(trim(p_notes), ''), v_max_prep
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO STRICT v_menu_item FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND available = TRUE;
        v_quantity := (v_item->>'quantity')::INT;
        INSERT INTO public.order_items (
            order_id, menu_item_id, item_name, item_name_kn, quantity, unit_price, total_price
        ) VALUES (
            v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.name_kn,
            v_quantity, v_menu_item.price, v_menu_item.price * v_quantity
        );
    END LOOP;

    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by, changed_by_name, reason)
    VALUES (v_order_id, NULL, 'PLACED', v_customer_id, trim(p_customer_name), 'Order created successfully');

    RETURN jsonb_build_object(
        'order_id', v_order_id, 'token_number', v_token_str,
        'token_date', v_today, 'tracking_token', v_tracking_token,
        'status', 'PLACED', 'subtotal', v_subtotal,
        'tax_amount', v_tax_amount, 'parcel_charge', v_parcel_charge, 'total_amount', v_total_amount
    );
END;
$$;
COMMIT;

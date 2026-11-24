BEGIN;
-- Persist a marker so rerunning setup does not restore removed baseline grants.
CREATE TABLE IF NOT EXISTS public.security_hardening_applied (id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id));
ALTER TABLE public.security_hardening_applied ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_hardening_applied FROM PUBLIC, anon, authenticated;
INSERT INTO public.security_hardening_applied VALUES (TRUE) ON CONFLICT DO NOTHING;

-- No direct profile writes, including edits to identity email or is_active.
REVOKE UPDATE ON public.user_profiles FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can update own profile or authorized users" ON public.user_profiles;

-- Never allow legacy credential/role administration to bypass the Auth service.
REVOKE ALL ON FUNCTION public.authenticate_user(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_user_account(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_account_role(UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_account_active(UUID,BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_account(UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_account_password(UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allow_legacy_auth_attempt(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.clear_legacy_auth_attempts(TEXT) FROM PUBLIC, anon, authenticated, service_role;
-- Invalidate legacy credentials without deleting account metadata.
UPDATE public.user_accounts SET password_hash = '', updated_at = NOW() WHERE password_hash <> '';

-- Mutating role grants must go through the audited, permission-checked RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.role_permissions FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.default_role_permissions (
    role_name TEXT NOT NULL REFERENCES public.roles(name),
    permission_key TEXT NOT NULL REFERENCES public.permissions(permission_key),
    PRIMARY KEY (role_name, permission_key)
);
ALTER TABLE public.default_role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.default_role_permissions FROM PUBLIC, anon, authenticated;
INSERT INTO public.default_role_permissions VALUES
('SUPER_ADMIN', 'dashboard.view'),
('SUPER_ADMIN', 'orders.create'),
('SUPER_ADMIN', 'orders.view_all'),
('SUPER_ADMIN', 'orders.view_own'),
('SUPER_ADMIN', 'orders.accept'),
('SUPER_ADMIN', 'orders.prepare'),
('SUPER_ADMIN', 'orders.mark_ready'),
('SUPER_ADMIN', 'orders.complete'),
('SUPER_ADMIN', 'orders.cancel'),
('SUPER_ADMIN', 'menu.view'),
('SUPER_ADMIN', 'menu.create'),
('SUPER_ADMIN', 'menu.update'),
('SUPER_ADMIN', 'menu.delete'),
('SUPER_ADMIN', 'menu.manage_price'),
('SUPER_ADMIN', 'users.view'),
('SUPER_ADMIN', 'users.create'),
('SUPER_ADMIN', 'users.update'),
('SUPER_ADMIN', 'users.deactivate'),
('SUPER_ADMIN', 'roles.assign'),
('SUPER_ADMIN', 'roles.manage'),
('SUPER_ADMIN', 'reports.view'),
('SUPER_ADMIN', 'reports.export'),
('SUPER_ADMIN', 'payments.view'),
('SUPER_ADMIN', 'payments.verify'),
('SUPER_ADMIN', 'payments.refund'),
('SUPER_ADMIN', 'settings.manage'),
('SUPER_ADMIN', 'audit_logs.view'),
('ADMIN', 'dashboard.view'),
('ADMIN', 'orders.create'),
('ADMIN', 'orders.view_all'),
('ADMIN', 'orders.view_own'),
('ADMIN', 'orders.accept'),
('ADMIN', 'orders.prepare'),
('ADMIN', 'orders.mark_ready'),
('ADMIN', 'orders.complete'),
('ADMIN', 'orders.cancel'),
('ADMIN', 'menu.view'),
('ADMIN', 'menu.create'),
('ADMIN', 'menu.update'),
('ADMIN', 'menu.delete'),
('ADMIN', 'menu.manage_price'),
('ADMIN', 'users.view'),
('ADMIN', 'users.create'),
('ADMIN', 'users.update'),
('ADMIN', 'users.deactivate'),
('ADMIN', 'reports.view'),
('ADMIN', 'reports.export'),
('ADMIN', 'payments.view'),
('ADMIN', 'payments.verify'),
('ADMIN', 'payments.refund'),
('ADMIN', 'audit_logs.view'),
('STAFF', 'dashboard.view'),
('STAFF', 'orders.create'),
('STAFF', 'orders.view_all'),
('STAFF', 'orders.view_own'),
('STAFF', 'orders.accept'),
('STAFF', 'orders.mark_ready'),
('STAFF', 'orders.complete'),
('STAFF', 'orders.cancel'),
('STAFF', 'menu.view'),
('STAFF', 'payments.view'),
('STAFF', 'payments.verify'),
('KITCHEN_STAFF', 'orders.view_all'),
('KITCHEN_STAFF', 'orders.prepare'),
('KITCHEN_STAFF', 'orders.mark_ready'),
('KITCHEN_STAFF', 'menu.view'),
('CUSTOMER', 'orders.create'),
('CUSTOMER', 'orders.view_own'),
('CUSTOMER', 'menu.view')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_role_permission_matrix()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
    IF NOT public.auth_has_permission('roles.manage') THEN
        RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
    END IF;
    SELECT jsonb_object_agg(name, grants) INTO result FROM (
        SELECT r.name, COALESCE(jsonb_agg(p.permission_key ORDER BY p.permission_key)
          FILTER (WHERE p.permission_key IS NOT NULL), '[]'::JSONB) AS grants
        FROM public.roles r LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
        LEFT JOIN public.permissions p ON p.id = rp.permission_id GROUP BY r.name
    ) matrix;
    RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_role_permission(p_role TEXT, p_permission TEXT, p_enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE role_uuid UUID; permission_uuid UUID;
BEGIN
    IF NOT public.auth_has_role('SUPER_ADMIN') OR NOT public.auth_has_permission('roles.manage') THEN
        RAISE EXCEPTION 'Only an active Super Admin may manage permissions' USING ERRCODE = '42501';
    END IF;
    IF p_role = 'SUPER_ADMIN' AND p_permission IN ('roles.manage','roles.assign','users.view','users.update') AND p_enabled IS NOT TRUE THEN
        RAISE EXCEPTION 'Owner recovery permissions cannot be removed';
    END IF;
    SELECT id INTO STRICT role_uuid FROM public.roles WHERE name = p_role FOR UPDATE;
    SELECT id INTO STRICT permission_uuid FROM public.permissions WHERE permission_key = p_permission;
    IF p_enabled IS NULL THEN RAISE EXCEPTION 'Enabled is required'; END IF;
    IF p_enabled THEN
        INSERT INTO public.role_permissions VALUES (role_uuid, permission_uuid) ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM public.role_permissions WHERE role_id = role_uuid AND permission_id = permission_uuid;
    END IF;
    INSERT INTO public.audit_logs(actor_id, action, entity_type, new_values)
    VALUES (auth.uid(), 'ROLE_PERMISSION_UPDATED', 'ROLE', jsonb_build_object('role',p_role,'permission',p_permission,'enabled',p_enabled));
END;
$$;
CREATE OR REPLACE FUNCTION public.reset_role_permissions()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.auth_has_role('SUPER_ADMIN') OR NOT public.auth_has_permission('roles.manage') THEN
        RAISE EXCEPTION 'Only an active Super Admin may reset permissions' USING ERRCODE = '42501';
    END IF;
    PERFORM id FROM public.roles ORDER BY id FOR UPDATE;
    DELETE FROM public.role_permissions rp USING public.roles r
    WHERE rp.role_id = r.id AND r.name IN ('SUPER_ADMIN','ADMIN','STAFF','KITCHEN_STAFF','CUSTOMER');
    INSERT INTO public.role_permissions(role_id, permission_id)
    SELECT r.id, p.id FROM public.default_role_permissions d
    JOIN public.roles r ON r.name=d.role_name JOIN public.permissions p ON p.permission_key=d.permission_key
    ON CONFLICT DO NOTHING;
    INSERT INTO public.audit_logs(actor_id, action, entity_type)
    VALUES (auth.uid(), 'ROLE_PERMISSIONS_RESET', 'ROLE');
END;
$$;
REVOKE ALL ON FUNCTION public.get_role_permission_matrix() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_role_permission(TEXT,TEXT,BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_role_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_role_permission_matrix() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_role_permission(TEXT,TEXT,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_role_permissions() TO authenticated;
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
    v_total_amount := v_subtotal + v_tax_amount;

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
        total_amount, payment_method, payment_status, order_status, notes,
        estimated_prep_time_minutes
    ) VALUES (
        v_token_str, v_today, v_tracking_token, v_customer_id, trim(p_customer_name),
        regexp_replace(p_customer_mobile, '[^0-9]', '', 'g'), p_order_type,
        CASE WHEN p_order_type = 'DINE_IN' THEN NULLIF(trim(p_table_number), '') ELSE NULL END,
        v_subtotal, v_tax_amount, v_total_amount, p_payment_method, 'PENDING',
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
        'tax_amount', v_tax_amount, 'total_amount', v_total_amount
    );
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_with_token(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_token(TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB, UUID) TO anon, authenticated;


COMMIT;

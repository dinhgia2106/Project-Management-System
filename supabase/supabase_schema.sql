-- ============================================================================
-- SUPABASE DATABASE SCHEMA FOR PROJECT MANAGEMENT SYSTEM
-- Simple auth without Supabase Auth - uses custom users table
-- This script is idempotent - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'mod', 'member');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'locked');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Not Started', 'Working on it', 'Stucking', 'In Review', 'Done');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'lock', 'unlock');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('task', 'group', 'user', 'task_file');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. USERS TABLE (Simple auth - no Supabase Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    status user_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================================
-- 3. TASK GROUPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    start_date DATE,
    end_date DATE,
    is_expanded BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_groups_created_by ON public.task_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_task_groups_sort_order ON public.task_groups(sort_order);

-- ============================================================================
-- 4. TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
    task TEXT NOT NULL DEFAULT '',
    owner TEXT NOT NULL DEFAULT '',
    assign TEXT NOT NULL DEFAULT '',
    status task_status NOT NULL DEFAULT 'Not Started',
    create_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimate_date DATE,
    notes TEXT NOT NULL DEFAULT '',
    reviewer TEXT NOT NULL DEFAULT '',
    review TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    -- Cell locking: JSONB containing field names that are locked
    -- Example: {"task": true, "status": true, "owner": false}
    locked_fields JSONB NOT NULL DEFAULT '{}',
    locked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON public.tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks(sort_order);

-- ============================================================================
-- 5. TASK FILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT '',
    url TEXT,
    added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);

-- ============================================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    username TEXT, -- Denormalized for historical record
    action audit_action NOT NULL,
    entity_type entity_type NOT NULL,
    entity_id UUID,
    entity_name TEXT, -- Denormalized description
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 7. FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to hash password (using pgcrypto)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql;

-- Function to register user
CREATE OR REPLACE FUNCTION register_user(
    p_username TEXT,
    p_password TEXT,
    p_role user_role DEFAULT 'member',
    p_status user_status DEFAULT 'pending'
)
RETURNS TABLE(id UUID, username TEXT, role user_role, status user_status) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    INSERT INTO public.users (username, password_hash, role, status)
    VALUES (p_username, hash_password(p_password), p_role, p_status)
    RETURNING users.id INTO v_user_id;
    
    RETURN QUERY SELECT users.id, users.username, users.role, users.status 
    FROM public.users WHERE users.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to login user
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS TABLE(id UUID, username TEXT, role user_role, status user_status) AS $$
BEGIN
    RETURN QUERY 
    SELECT u.id, u.username, u.role, u.status
    FROM public.users u
    WHERE u.username = p_username 
      AND verify_password(p_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id UUID,
    p_action audit_action,
    p_entity_type entity_type,
    p_entity_id UUID,
    p_entity_name TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_username TEXT;
    v_audit_id UUID;
BEGIN
    SELECT username INTO v_username FROM public.users WHERE id = p_user_id;
    
    INSERT INTO public.audit_logs (
        user_id, username, action, entity_type, entity_id, 
        entity_name, old_values, new_values
    )
    VALUES (
        p_user_id, v_username, p_action, p_entity_type, p_entity_id,
        p_entity_name, p_old_values, p_new_values
    )
    RETURNING audit_logs.id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Drop existing triggers first (for idempotency)
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_task_groups_updated_at ON public.task_groups;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_groups_updated_at
    BEFORE UPDATE ON public.task_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. ENABLE PGCRYPTO EXTENSION (for password hashing)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) - DISABLED for simple auth
-- We handle authorization in the application layer
-- ============================================================================

-- Disable RLS for simpler access (we control access in app)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. GRANTS - Allow anon access (we handle auth in app)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

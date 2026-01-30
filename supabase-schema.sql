-- ============================================
-- Supabase SQL Schema for Scrum PM System
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow read app_settings" ON app_settings;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Admin/Mod can create projects" ON projects;
DROP POLICY IF EXISTS "Admin/Mod can update projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view project members" ON project_members;
DROP POLICY IF EXISTS "Admin/Mod can manage project members" ON project_members;
DROP POLICY IF EXISTS "Anyone can view field locks" ON field_locks;
DROP POLICY IF EXISTS "Admin/Mod can manage field locks" ON field_locks;
DROP POLICY IF EXISTS "Anyone can view sprints" ON sprints;
DROP POLICY IF EXISTS "Admin/Mod can manage sprints" ON sprints;
DROP POLICY IF EXISTS "Anyone can view tasks" ON tasks;
DROP POLICY IF EXISTS "Active members can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Active users can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Active users can insert activity logs" ON activity_logs;

-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS log_activity(TEXT, TEXT, UUID, JSONB);

-- App settings (for admin invite code)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default admin invite code (change this!)
INSERT INTO app_settings (key, value) 
VALUES ('admin_invite_code', 'change_this_code')
ON CONFLICT (key) DO NOTHING;

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'mod', 'member')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  approved_by UUID REFERENCES profiles(id),
  invite_code_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- Field locks (per project)
CREATE TABLE IF NOT EXISTS field_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  locked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, field_name)
);

-- Sprints
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  estimate_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  story_points INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Database Function: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_code TEXT;
  admin_code TEXT;
  user_role TEXT := 'member';
  user_status TEXT := 'pending';
BEGIN
  -- Get invite code from user metadata
  invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  -- Get admin invite code from settings
  SELECT value INTO admin_code FROM app_settings WHERE key = 'admin_invite_code';
  
  -- Check if invite code matches admin code
  IF invite_code IS NOT NULL AND invite_code = admin_code THEN
    user_role := 'admin';
    user_status := 'active';
  END IF;
  
  -- Create profile
  INSERT INTO profiles (id, email, display_name, role, status, invite_code_used)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    user_role,
    user_status,
    invite_code
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- App settings: readable by everyone
CREATE POLICY "Allow read app_settings" ON app_settings
  FOR SELECT USING (true);

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Projects policies
CREATE POLICY "Anyone can view projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Admin/Mod can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod') AND status = 'active')
  );

CREATE POLICY "Admin/Mod can update projects" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod') AND status = 'active')
  );

-- Project members policies
CREATE POLICY "Anyone can view project members" ON project_members
  FOR SELECT USING (true);

CREATE POLICY "Admin/Mod can manage project members" ON project_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod') AND status = 'active')
  );

-- Field locks policies
CREATE POLICY "Anyone can view field locks" ON field_locks
  FOR SELECT USING (true);

CREATE POLICY "Admin/Mod can manage field locks" ON field_locks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod') AND status = 'active')
  );

-- Sprints policies
CREATE POLICY "Anyone can view sprints" ON sprints
  FOR SELECT USING (true);

CREATE POLICY "Admin/Mod can manage sprints" ON sprints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'mod') AND status = 'active')
  );

-- Tasks policies
CREATE POLICY "Anyone can view tasks" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Active members can manage tasks" ON tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

-- Activity logs policies
CREATE POLICY "Active users can view activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Active users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

-- ============================================
-- Database Functions
-- ============================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

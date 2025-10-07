-- Add user account status management
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');

ALTER TABLE public.profiles 
ADD COLUMN status user_status NOT NULL DEFAULT 'active',
ADD COLUMN suspended_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN ban_reason TEXT,
ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create announcements table
CREATE TABLE public.announcements (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements"
ON public.announcements FOR SELECT
USING (is_active = true AND start_date <= now() AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create feature flags table
CREATE TABLE public.feature_flags (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
ON public.feature_flags FOR SELECT
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  admin_response TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add approval status to tracker templates
ALTER TABLE public.tracker_templates
ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT,
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Update policy to only show approved templates to non-admins
DROP POLICY IF EXISTS "Anyone can view templates" ON public.tracker_templates;

CREATE POLICY "Anyone can view approved templates"
ON public.tracker_templates FOR SELECT
USING (approval_status = 'approved' OR auth.uid() = creator_id OR has_role(auth.uid(), 'admin'));

-- Create error logs table
CREATE TABLE public.error_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT,
  severity TEXT NOT NULL DEFAULT 'error', -- info, warning, error, critical
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view error logs"
ON public.error_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own error logs"
ON public.error_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create admin activity log
CREATE TABLE public.admin_activity_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- user, template, challenge, etc
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
ON public.admin_activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active_at DESC);
CREATE INDEX idx_announcements_active ON public.announcements(is_active, start_date, end_date);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_tracker_templates_approval ON public.tracker_templates(approval_status);
CREATE INDEX idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX idx_admin_activity_created ON public.admin_activity_logs(created_at DESC);
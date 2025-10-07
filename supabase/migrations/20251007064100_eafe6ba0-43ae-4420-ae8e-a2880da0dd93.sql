-- Create trackers table for user-defined trackers
CREATE TABLE public.trackers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('boolean', 'number', 'scale')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trackers
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;

-- RLS policies for trackers
CREATE POLICY "Users can view their own trackers"
  ON public.trackers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trackers"
  ON public.trackers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trackers"
  ON public.trackers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trackers"
  ON public.trackers FOR DELETE
  USING (auth.uid() = user_id);

-- Create custom_logs table for tracker data
CREATE TABLE public.custom_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  log_id BIGINT NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  tracker_id BIGINT NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(log_id, tracker_id)
);

-- Enable RLS on custom_logs
ALTER TABLE public.custom_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_logs (access through daily_logs user_id)
CREATE POLICY "Users can view their own custom logs"
  ON public.custom_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs
      WHERE daily_logs.id = custom_logs.log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own custom logs"
  ON public.custom_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_logs
      WHERE daily_logs.id = custom_logs.log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own custom logs"
  ON public.custom_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs
      WHERE daily_logs.id = custom_logs.log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own custom logs"
  ON public.custom_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs
      WHERE daily_logs.id = custom_logs.log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

-- Add streak_tracker_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN streak_tracker_id BIGINT REFERENCES public.trackers(id) ON DELETE SET NULL;
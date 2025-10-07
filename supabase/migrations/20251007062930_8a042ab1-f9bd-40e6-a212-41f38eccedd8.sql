-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create daily_logs table
CREATE TABLE public.daily_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
  sleep_hours NUMERIC(3,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  exercised BOOLEAN DEFAULT false,
  coffee_cups INTEGER DEFAULT 0 CHECK (coffee_cups >= 0),
  memo TEXT CHECK (char_length(memo) <= 200),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS on daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Daily logs policies
CREATE POLICY "Users can view their own logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    NEW.id,
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
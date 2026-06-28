-- Timesheet App schema

INSERT INTO public.projects (id, name, slug, allowed_origins)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Timesheet App',
  'timesheet-app',
  ARRAY['http://localhost:5180', 'https://timesheet.whitelynx.co.nz']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  allowed_origins = EXCLUDED.allowed_origins;

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  boss_email TEXT NOT NULL DEFAULT '',
  employee_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, work_date)
);

CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_work_date_idx ON public.time_entries(work_date);

CREATE TABLE IF NOT EXISTS public.week_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_sent_to TEXT NOT NULL,
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS week_submissions_user_id_idx ON public.week_submissions(user_id);

CREATE OR REPLACE FUNCTION public.week_start_for(d DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (d - (EXTRACT(ISODOW FROM d)::INT - 1))::DATE;
$$;

CREATE OR REPLACE FUNCTION public.is_week_locked(p_user_id UUID, p_work_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.week_submissions ws
    WHERE ws.user_id = p_user_id
      AND ws.week_start = public.week_start_for(p_work_date)
  );
$$;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
CREATE POLICY user_settings_insert_own ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_update_own ON public.user_settings;
CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS time_entries_select_own ON public.time_entries;
CREATE POLICY time_entries_select_own ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS time_entries_insert_own ON public.time_entries;
CREATE POLICY time_entries_insert_own ON public.time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_week_locked(auth.uid(), work_date)
  );

DROP POLICY IF EXISTS time_entries_update_own ON public.time_entries;
CREATE POLICY time_entries_update_own ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_week_locked(auth.uid(), work_date)
  );

DROP POLICY IF EXISTS time_entries_delete_own ON public.time_entries;
CREATE POLICY time_entries_delete_own ON public.time_entries
  FOR DELETE USING (
    auth.uid() = user_id
    AND NOT public.is_week_locked(auth.uid(), work_date)
  );

DROP POLICY IF EXISTS week_submissions_select_own ON public.week_submissions;
CREATE POLICY week_submissions_select_own ON public.week_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS week_submissions_insert_own ON public.week_submissions;
CREATE POLICY week_submissions_insert_own ON public.week_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

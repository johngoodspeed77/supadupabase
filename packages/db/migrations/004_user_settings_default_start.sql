-- Default shift start time for new day entries (Timesheet App settings)

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_start_time TIME NOT NULL DEFAULT '07:00:00';

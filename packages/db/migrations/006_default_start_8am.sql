-- Default weekday auto-fill: 8:00 AM start (40 h Mon–Fri week)

ALTER TABLE public.user_settings
  ALTER COLUMN default_start_time SET DEFAULT '08:00:00';

UPDATE public.user_settings
SET default_start_time = '08:00:00'
WHERE default_start_time = '07:00:00';

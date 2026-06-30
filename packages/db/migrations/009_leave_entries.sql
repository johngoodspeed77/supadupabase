-- Leave types and optional half-day duration on time_entries

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'work',
  ADD COLUMN IF NOT EXISTS leave_type TEXT,
  ADD COLUMN IF NOT EXISTS leave_duration TEXT;

UPDATE public.time_entries SET entry_type = 'work' WHERE entry_type IS NULL;

ALTER TABLE public.time_entries
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL;

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_entry_type_check;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_entry_type_check
  CHECK (entry_type IN ('work', 'leave'));

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_leave_type_check;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_leave_type_check
  CHECK (
    leave_type IS NULL
    OR leave_type IN (
      'day_off',
      'non_paid_leave',
      'annual_leave',
      'sick_leave',
      'medical_leave',
      'bereavement_leave'
    )
  );

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_leave_duration_check;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_leave_duration_check
  CHECK (leave_duration IS NULL OR leave_duration IN ('full', 'am', 'pm'));

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_work_leave_shape_check;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_work_leave_shape_check
  CHECK (
    (
      entry_type = 'work'
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
      AND leave_type IS NULL
      AND leave_duration IS NULL
    )
    OR (
      entry_type = 'leave'
      AND start_time IS NULL
      AND end_time IS NULL
      AND leave_type IS NOT NULL
      AND (
        (
          leave_type IN ('day_off', 'non_paid_leave')
          AND leave_duration IS NULL
        )
        OR (
          leave_type IN ('annual_leave', 'sick_leave', 'medical_leave', 'bereavement_leave')
          AND leave_duration IS NOT NULL
        )
      )
    )
  );

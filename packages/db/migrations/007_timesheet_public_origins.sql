-- Ensure timesheet-app allows public PWA origin (Option B split-VM deploy)

UPDATE public.projects
SET allowed_origins = (
  SELECT COALESCE(array_agg(DISTINCT origin), '{}')
  FROM unnest(
    allowed_origins || ARRAY[
      'https://timesheet.whitelynx.co.nz',
      'http://192.168.1.19:5180',
      'http://localhost:5180'
    ]
  ) AS origin
)
WHERE slug = 'timesheet-app';

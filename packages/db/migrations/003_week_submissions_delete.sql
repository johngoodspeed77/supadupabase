-- Allow users to unlock a submitted week (delete their own submission row)

DROP POLICY IF EXISTS week_submissions_delete_own ON public.week_submissions;
CREATE POLICY week_submissions_delete_own ON public.week_submissions
  FOR DELETE USING (auth.uid() = user_id);

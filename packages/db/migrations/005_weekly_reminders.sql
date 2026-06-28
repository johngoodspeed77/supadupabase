-- Weekly PWA reminder (Sunday 3pm NZ) + Web Push subscriptions

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS weekly_reminder_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

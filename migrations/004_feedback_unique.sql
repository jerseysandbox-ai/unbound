alter table public.unbound_feedback
  add constraint unbound_feedback_user_plan_unique unique (user_id, plan_id);

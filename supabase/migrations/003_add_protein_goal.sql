-- Add protein goal to profiles (defaults to 1.6 g/kg × 70 kg = 112 g)
alter table profiles
  add column if not exists protein_goal_g numeric(6, 1) not null default 112;

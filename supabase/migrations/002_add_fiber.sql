-- Add fiber tracking to food_logs
alter table food_logs
  add column if not exists fiber_g numeric(8, 2) not null default 0;

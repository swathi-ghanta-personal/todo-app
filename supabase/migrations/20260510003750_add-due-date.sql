-- Optional due date per todo (nullable). Row ownership is still via user_id;
-- existing RLS policies on todos apply to all columns; no policy changes needed.
alter table todos
  add column due_date date;

-- Ensure the logged-in console user can WRITE content. Run in the Supabase SQL
-- Editor if the admin gets "new row violates row-level security policy for table
-- 'lectures'/'collections'" — that means is_editor() is false for their account
-- (their auth user isn't an owner/editor row in admin_users).
--
-- The public app has NO login, so every row in auth.users is an admin account.
-- This makes them all `owner` in admin_users, which satisfies is_admin()/is_editor().

-- 1) Remove stale admin_users rows whose id isn't a real auth user (prevents the
--    unique-email constraint from blocking the upsert below).
delete from admin_users a
where not exists (select 1 from auth.users u where u.id = a.id);

-- 2) Upsert every auth user as an owner admin.
insert into admin_users (id, name, email, role)
select u.id,
       coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
       u.email,
       'owner'
from auth.users u
on conflict (id) do update set role = 'owner', email = excluded.email;

-- 3) Verify.
select id, email, role from admin_users;

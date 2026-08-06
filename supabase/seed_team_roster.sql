-- Align staff profiles with homepage Our Team (src/data/team.ts).
-- Demo auth emails (manager@rebel.demo, etc.) are unchanged so EMP-* logins still work.

update profiles set full_name = 'Hunter Thomas', email = 'hunter.thomas@rebelmarketing.demo', department = 'Account Management'
  where id = '11111111-1111-1111-1111-111111111101';
update profiles set full_name = 'Jackson Thomas', email = 'jackson.thomas@rebelmarketing.demo', department = 'Strategy'
  where id = '11111111-1111-1111-1111-111111111102';
update profiles set full_name = 'Will Watson', email = 'will.watson@rebelmarketing.demo', department = 'Analytics', role = 'marketing'
  where id = '11111111-1111-1111-1111-111111111103';
update profiles set full_name = 'McKane Everett', email = 'mckane.everett@rebelmarketing.demo', department = 'Content'
  where id = '11111111-1111-1111-1111-111111111104';
update profiles set full_name = 'Sydney Himmelbaum', email = 'sydney.himmelbaum@rebelmarketing.demo', department = 'Social'
  where id = '11111111-1111-1111-1111-111111111105';
update profiles set full_name = 'Mary Kate Sheppard', email = 'marykate.sheppard@rebelmarketing.demo', department = 'Leadership'
  where id = '11111111-1111-1111-1111-111111111106';

update profiles set full_name = 'HP Hazelwood', email = 'hp.hazelwood@rebelmarketing.demo', department = 'Creative'
  where id = '837c9868-fad0-49c1-8c21-f0178ecfecd4';
update profiles set full_name = 'Joshua Harvel', email = 'joshua.harvel@rebelmarketing.demo', department = 'Media'
  where id = '6133b095-6828-491a-b6a7-4a57e01f8f2b';

-- Remove duplicate Hunter Thomas account (keep EMP-1001 only)
-- Reassign any remaining FKs to EMP-1001 first if re-running on a dirty DB.
delete from profiles where id = 'ab918df3-aab2-48ec-a979-86ea7e008504';
delete from auth.users where id = 'ab918df3-aab2-48ec-a979-86ea7e008504';

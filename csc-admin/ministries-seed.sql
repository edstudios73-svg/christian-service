-- Christian Service Church: add the core ministries to the admin so they can be edited there.
-- OPTIONAL. The website already shows these ministries by default; run this only if you want to edit them
-- in the admin (Ministries). Safe to run more than once: it skips any ministry that already exists.
-- Paste the whole file in Supabase > SQL Editor > Run.

insert into public.ministries (title, body, image, published, created_at)
select 'Children''s Ministry', 'Raising the next generation of believers. Through Bible stories, songs, games and loving mentors, our children discover that Jesus loves them and build a faith that lasts a lifetime.', 'assets/ministries/children-art.jpg', true, now() + interval '0 seconds'
where not exists (select 1 from public.ministries where title ilike '%child%');

insert into public.ministries (title, body, image, published, created_at)
select 'Vibrant Youth', 'Young, bold and on fire for God. Vibrant Youth brings teens and young adults together for powerful worship, real conversations, purpose and lasting friendships, equipping a generation to stand out for Christ.', 'assets/ministries/vibrant-youth-art.jpg', true, now() + interval '1 seconds'
where not exists (select 1 from public.ministries where title ilike '%youth%');

insert into public.ministries (title, body, image, published, created_at)
select 'Prayer Department', 'The engine room of the church. Our intercessors stand in the gap for the church, the city and the nation, believing God for breakthroughs, healing and answered prayers.', 'assets/ministries/prayer-department-art.jpg', true, now() + interval '2 seconds'
where not exists (select 1 from public.ministries where title ilike '%prayer%');

insert into public.ministries (title, body, image, published, created_at)
select 'Ushers and Protocol', 'The warm face of our hospitality. Our well-trained team welcomes every guest, keeps every service orderly and makes sure everyone feels at home from the gate to the seat.', 'assets/ministries/ushers-and-protocol-art.jpg', true, now() + interval '3 seconds'
where not exists (select 1 from public.ministries where title ilike '%usher%');

insert into public.ministries (title, body, image, published, created_at)
select 'Ezekiel Choir', 'Our voices lifted in worship. The Ezekiel Choir ushers the church into the presence of God with anointed songs, rich harmony and excellence every Sunday and at special services.', 'assets/ministries/ezekiel-choir-art.jpg', true, now() + interval '4 seconds'
where not exists (select 1 from public.ministries where title ilike '%choir%');

insert into public.ministries (title, body, image, published, created_at)
select 'Media Ministry', 'Taking the Word further. From cameras and sound to live streaming, photos and graphics, our creative team captures every moment so the message reaches far beyond our walls.', 'assets/ministries/media-ministry-art.jpg', true, now() + interval '5 seconds'
where not exists (select 1 from public.ministries where title ilike '%media%');

insert into public.ministries (title, body, image, published, created_at)
select 'Evangelism Team', 'Taking the Gospel to every street. Our evangelists share the Good News through outreach, visits and everyday conversations, leading souls to Christ and welcoming them home.', 'assets/ministries/evangelism-team-art.jpg', true, now() + interval '6 seconds'
where not exists (select 1 from public.ministries where title ilike '%evangel%');

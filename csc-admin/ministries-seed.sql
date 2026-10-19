-- Christian Service Church: add the core ministries to the admin so they can be edited there.
-- OPTIONAL. The website already shows these ministries by default; run this only if you want to edit them
-- in the admin (Ministries). Safe to run more than once: it skips any ministry that already exists.
-- Paste the whole file in Supabase > SQL Editor > Run.

insert into public.ministries (title, body, image, published, created_at)
select 'Children''s Ministry', 'Where little hearts meet a big God. Through Bible stories, songs, games and loving teachers, our children learn that Jesus is real, that they are loved and that they were made on purpose. We are raising the next generation of believers, one joyful Sunday at a time.', 'assets/ministries/children-photo.jpg', true, now() + interval '0 seconds'
where not exists (select 1 from public.ministries where title ilike '%child%');

insert into public.ministries (title, body, image, published, created_at)
select 'Vibrant Youth', 'Loud worship, real talk and friendships that last. Vibrant Youth is where teens and young adults find purpose, ask the hard questions and discover that following Jesus is the boldest adventure there is. Come as you are. Leave on fire.', 'assets/ministries/vibrant-youth-photo.jpg', true, now() + interval '1 seconds'
where not exists (select 1 from public.ministries where title ilike '%youth%');

insert into public.ministries (title, body, image, published, created_at)
select 'Prayer Department', 'The engine room of the church. Our intercessors stand in the gap for every family, every service and the nation, believing God for breakthroughs, healing and answered prayers. If you need someone to pray with you, this is your family.', 'assets/ministries/prayer-department-art.jpg', true, now() + interval '2 seconds'
where not exists (select 1 from public.ministries where title ilike '%prayer%');

insert into public.ministries (title, body, image, published, created_at)
select 'Ushers and Protocol', 'The first smile you see and the last goodbye you hear. Our ushers welcome every guest, keep every service in order and make sure everyone finds a seat and a home. Serving with excellence is how we say, you are welcome here.', 'assets/ministries/ushers-photo.jpg', true, now() + interval '3 seconds'
where not exists (select 1 from public.ministries where title ilike '%usher%');

insert into public.ministries (title, body, image, published, created_at)
select 'Ezekiel Choir', 'Voices lifted, hearts surrendered. The Ezekiel Choir leads the church into the presence of God with rich harmony, anointed songs and excellence, every Sunday and at every special service. Worship is not a performance here. It is an offering.', 'assets/ministries/ezekiel-choir-photo.jpg', true, now() + interval '4 seconds'
where not exists (select 1 from public.ministries where title ilike '%choir%');

insert into public.ministries (title, body, image, published, created_at)
select 'Media Ministry', 'We carry the message further than these walls. From cameras and sound to live streaming, photos and graphics, our creative team captures every moment so that someone watching from anywhere can feel at home. Behind every screen is someone serving with a smile.', 'assets/ministries/media-ministry-photo.jpg', true, now() + interval '5 seconds'
where not exists (select 1 from public.ministries where title ilike '%media%');

insert into public.ministries (title, body, image, published, created_at)
select 'Evangelism Team', 'Taking the Gospel to every street. Our evangelists share the Good News through outreach, home visits and everyday conversations, leading souls to Christ and walking with them until they feel at home in God''s family. Souls are the heartbeat of this church.', 'assets/ministries/evangelism-photo.jpg', true, now() + interval '6 seconds'
where not exists (select 1 from public.ministries where title ilike '%evangel%');

insert into public.ministries (title, body, image, published, created_at, updated_at)
select 'Virtuous Women of Destiny', 'Women of grace, strength and purpose. Virtuous Women of Destiny gathers the women of the church to pray, learn the Word, encourage one another and step boldly into everything God has prepared for them. Come and be refreshed, restored and sent.', 'assets/ministries/virtuous-women-photo.jpg', true, now() + interval '7 seconds', now()
where not exists (select 1 from public.ministries where title ilike '%virtuous%' or title ilike '%women%');

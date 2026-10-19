-- Updates the ministry descriptions on the Ministries page. Only rows still showing the old default text are changed, so anything you edited yourself is kept.

update public.ministries set body = 'Where little hearts meet a big God. Through Bible stories, songs, games and loving teachers, our children learn that Jesus is real, that they are loved and that they were made on purpose. We are raising the next generation of believers, one joyful Sunday at a time.', updated_at = now()
where title ilike '%child%' and body = 'Raising the next generation of believers. Through Bible stories, songs, games and loving mentors, our children discover that Jesus loves them and build a faith that lasts a lifetime.';

update public.ministries set body = 'Loud worship, real talk and friendships that last. Vibrant Youth is where teens and young adults find purpose, ask the hard questions and discover that following Jesus is the boldest adventure there is. Come as you are. Leave on fire.', updated_at = now()
where (title ilike '%youth%' or title ilike '%vibrant%') and body = 'Young, bold and on fire for God. Vibrant Youth brings teens and young adults together for powerful worship, real conversations, purpose and lasting friendships, equipping a generation to stand out for Christ.';

update public.ministries set body = 'The engine room of the church. Our intercessors stand in the gap for every family, every service and the nation, believing God for breakthroughs, healing and answered prayers. If you need someone to pray with you, this is your family.', updated_at = now()
where title ilike '%prayer%' and body = 'The engine room of the church. Our intercessors stand in the gap for the church, the city and the nation, believing God for breakthroughs, healing and answered prayers.';

update public.ministries set body = 'The first smile you see and the last goodbye you hear. Our ushers welcome every guest, keep every service in order and make sure everyone finds a seat and a home. Serving with excellence is how we say, you are welcome here.', updated_at = now()
where (title ilike '%usher%' or title ilike '%protocol%') and body = 'The warm face of our hospitality. Our well-trained team welcomes every guest, keeps every service orderly and makes sure everyone feels at home from the gate to the seat.';

update public.ministries set body = 'Voices lifted, hearts surrendered. The Ezekiel Choir leads the church into the presence of God with rich harmony, anointed songs and excellence, every Sunday and at every special service. Worship is not a performance here. It is an offering.', updated_at = now()
where (title ilike '%choir%' or title ilike '%ezekiel%') and body = 'Our voices lifted in worship. The Ezekiel Choir ushers the church into the presence of God with anointed songs, rich harmony and excellence every Sunday and at special services.';

update public.ministries set body = 'We carry the message further than these walls. From cameras and sound to live streaming, photos and graphics, our creative team captures every moment so that someone watching from anywhere can feel at home. Behind every screen is someone serving with a smile.', updated_at = now()
where title ilike '%media%' and body = 'Taking the Word further. From cameras and sound to live streaming, photos and graphics, our creative team captures every moment so the message reaches far beyond our walls.';

update public.ministries set body = 'Taking the Gospel to every street. Our evangelists share the Good News through outreach, home visits and everyday conversations, leading souls to Christ and walking with them until they feel at home in God''s family. Souls are the heartbeat of this church.', updated_at = now()
where title ilike '%evangel%' and body = 'Taking the Gospel to every street. Our evangelists share the Good News through outreach, visits and everyday conversations, leading souls to Christ and welcoming them home.';

update public.ministries set body = 'Women of grace, strength and purpose. Virtuous Women of Destiny gathers the women of the church to pray, learn the Word, encourage one another and step boldly into everything God has prepared for them. Come and be refreshed, restored and sent.', updated_at = now()
where (title ilike '%virtuous%' or title ilike '%women%') and body = 'Women of grace, strength and purpose. Virtuous Women of Destiny gathers the women of the church to pray, grow in the Word, encourage one another and walk boldly into everything God has prepared for them.';

-- Virtuous Women of Destiny: use the new picture if it still has the old standard one
update public.ministries set image = '/assets/ministries/virtuous-women-photo.jpg', updated_at = now()
where (title ilike '%virtuous%' or title ilike '%women%') and image in ('assets/ministries/virtuous-women-art.jpg', '/assets/ministries/virtuous-women-art.jpg');

select 'updated' as status;

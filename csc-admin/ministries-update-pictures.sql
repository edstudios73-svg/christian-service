-- Switches the standard ministry pictures to the new photos. Only cards still on the old standard picture are changed,
-- so any picture you uploaded yourself is kept.
update public.ministries set image = '/assets/ministries/media-ministry-photo.jpg', updated_at = now()
where title ilike '%media%' and image in ('assets/ministries/media-ministry-art.jpg', '/assets/ministries/media-ministry-art.jpg');

update public.ministries set image = '/assets/ministries/children-photo.jpg', updated_at = now()
where title ilike '%child%' and image in ('assets/ministries/children-art.jpg', '/assets/ministries/children-art.jpg');

update public.ministries set image = '/assets/ministries/vibrant-youth-photo.jpg', updated_at = now()
where (title ilike '%youth%' or title ilike '%vibrant%') and image in ('assets/ministries/vibrant-youth-art.jpg', '/assets/ministries/vibrant-youth-art.jpg');

select 'updated' as status;

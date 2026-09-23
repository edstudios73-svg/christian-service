(function () {
  'use strict';

  const galleryImages = [
    { src: 'gallery/building.jpg',            caption: 'Christian Service Church signboard showing weekly service times, Jungle Avenue Road, East Legon, Accra' },
    { src: 'gallery/IMG-20260816-WA0012.jpg', caption: 'Members seated during a Sunday worship service at Christian Service Church, East Legon' },
    { src: 'gallery/IMG-20260816-WA0014.jpg', caption: 'Women of the church standing for prayer during a Sunday service in East Legon, Accra' },
    { src: 'gallery/IMG-20260816-WA0013.jpg', caption: 'Congregation gathered for worship at Christian Service Church, Accra' },
    { src: 'gallery/IMG-20260816-WA0011.jpg', caption: 'A moment from a church programme at Christian Service Church, East Legon' },
    { src: 'gallery/rev dr payin.jpeg',       caption: 'Rev. Dr. Joseph Payin Ezekiel, General Overseer of Christian Service Church' },
    { src: 'gallery/gifty ezekiel.png',       caption: 'Prophetess Dr. Gifty Ezekiel, Deputy General Overseer of Christian Service Church' },
    { src: 'gallery/LADY PASTOR.jpeg',        caption: 'Kate Quashigah, Lady Pastor at Christian Service Church, Accra' },
    { src: 'gallery/ELDER.jpeg',              caption: 'Ivan Quashigah, Church Elder at Christian Service Church, East Legon' },
    { src: 'gallery/john.jpeg',               caption: 'John Essien, Choir Leader at Christian Service Church, Accra' },
    { src: 'gallery/4.jpeg',                  caption: 'Worship in progress at Christian Service Church, House of Testimonies' },
    { src: 'gallery/11.jpg',                  caption: 'Christian Service Church, House of Testimonies — Our Year of Building, Psalm 127:1' },
  ];

  const highlightCandidates = Array.from({ length: 700 }, (_, index) => `assets/Highlights/831A${index + 2577}.jpg`)
    .concat('assets/Highlights/831A3139-Edit-2.jpg');

  function highlightImages() {
    return highlightCandidates.map((src) => ({
      src,
      caption: 'Christian Service Church highlight, House of Testimonies'
    }));
  }

  function initGallery() {
    const mount = document.querySelector('[data-gallery-grid]');
    if (!mount) return;

    const images = galleryImages.concat(highlightImages());
    if (!images.length) {
      mount.innerHTML = '<div class="gallery-empty">No images are available in the gallery folder yet.</div>';
      return;
    }

    mount.innerHTML = images.map((item) => `
      <article class="gallery-item" data-lightbox="${item.src}" data-caption="${item.caption}">
        <img src="${item.src}" alt="${item.caption}" loading="lazy" onerror="this.closest('.gallery-item').remove()">
        <div class="gallery-item__overlay">${item.caption}</div>
      </article>
    `).join('');

    mount.classList.add('is-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
  } else {
    initGallery();
  }
})();

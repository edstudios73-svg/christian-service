(function () {
  'use strict';

  const galleryImages = [
    { src: 'gallery/building.jpg', caption: 'Christian Service Church signboard showing weekly service times, Jungle Avenue Road, East Legon, Accra' },
    { src: 'gallery/IMG-20260816-WA0011.jpg', caption: 'A church programme at Christian Service Church, East Legon' },
    { src: 'gallery/IMG-20260816-WA0012.jpg', caption: 'Members seated during a Sunday worship service at Christian Service Church, East Legon' },
    { src: 'gallery/IMG-20260816-WA0013.jpg', caption: 'Congregation gathered for worship at Christian Service Church, Accra' },
    { src: 'gallery/IMG-20260816-WA0014.jpg', caption: 'Women of the church standing for prayer during a Sunday service in East Legon, Accra' },
    { src: 'gallery/LEADERS.jpg', caption: 'Church leaders at Christian Service Church, East Legon, Accra' },
    { src: 'gallery/WORSHIP.jpg', caption: 'Worship in progress at Christian Service Church, House of Testimonies' },
    { src: 'gallery/TEACHING.jpg', caption: 'Bible teaching and discipleship at Christian Service Church' },
    { src: 'gallery/PRAYER.jpg', caption: 'Prayer and intercession at Christian Service Church' },
    { src: 'gallery/FAMILY.jpg', caption: 'The church family worshipping together in fellowship' },
    { src: 'gallery/DR EZEKIEL.jpg', caption: 'Rev. Dr. Joseph Payin Ezekiel, General Overseer of Christian Service Church' },
    { src: 'gallery/LADY PASTOR.jpg', caption: 'Lady Pastor and church leaders at Christian Service Church, Accra' },
    { src: 'gallery/ELDER.jpeg', caption: 'A church elder and ministry leader at Christian Service Church, East Legon' },
    { src: 'gallery/gifty ezekiel.png', caption: 'Prophetess Dr. Gifty Ezekiel, Deputy General Overseer of Christian Service Church' }
  ];

  const highlightCandidates = [
    'assets/Highlights/831A2577.jpg',
    'assets/Highlights/831A2581.jpg',
    'assets/Highlights/831A2603.jpg',
    'assets/Highlights/831A2670.jpg',
    'assets/Highlights/831A2774.jpg',
    'assets/Highlights/831A3139-Edit-2.jpg'
  ];

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

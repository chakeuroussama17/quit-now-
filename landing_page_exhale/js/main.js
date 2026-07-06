/* ─────────────────────────────────────────────────────────────
   Exhale landing — interactions
   Image placeholders · smooth anchors · 3D tilt · scroll reveals.
   ───────────────────────────────────────────────────────────── */

// 1. Image placeholders ----------------------------------------------------
// Any <img class="ph"> that fails to load (asset not added yet) becomes a
// labelled placeholder telling you what to drop in + the path.
function placeholder(img) {
  const box = document.createElement('div');
  box.className = 'placeholder ' + (img.className || '');
  box.classList.remove('ph');
  const ratio = img.dataset.ratio || '1/1';
  box.style.aspectRatio = ratio.replace('/', ' / ');

  if (img.hasAttribute('data-mini')) {
    box.classList.add('placeholder--mini');
    box.textContent = '📷';
  } else {
    box.innerHTML = `<span>📷 ${img.dataset.ph || 'Image'}</span><small>${img.getAttribute('src') || ''}</small>`;
  }
  img.replaceWith(box);
}
window.placeholder = placeholder;

document.querySelectorAll('img.ph').forEach((img) => {
  if (img.complete && img.naturalWidth === 0) placeholder(img);
});

// 2. Smooth anchor scrolling ----------------------------------------------
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// 3. 3D tilt on phone mockups ---------------------------------------------
if (window.VanillaTilt) {
  VanillaTilt.init(document.querySelectorAll('[data-tilt]'), {
    max: 8, speed: 400, glare: true, 'max-glare': 0.12, scale: 1.02,
  });
}

// 4. Scroll reveals (GSAP; graceful fallback if CDN blocked) ---------------
if (!(window.gsap && window.ScrollTrigger)) {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
} else {
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
}

// 5. Nav glass on scroll ---------------------------------------------------
const header = document.querySelector('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const header = document.querySelector('[data-header]');
const revealItems = document.querySelectorAll('.reveal');

const syncHeader = () => {
  if (header) {
    header.classList.toggle('is-scrolled', window.scrollY > 18 || document.body.classList.contains('auth-page'));
  }
};

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.18
});

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 80, 240)}ms`;
  observer.observe(item);
});

const authTabs = document.querySelectorAll('[data-auth-tab]');
const authForms = document.querySelectorAll('[data-auth-form]');

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.authTab;

    authTabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });

    authForms.forEach((form) => {
      form.classList.toggle('is-active', form.dataset.authForm === target);
    });
  });
});

const contactSlides = document.querySelectorAll('[data-contact-slide]');
let contactSlideIndex = 0;

if (contactSlides.length > 1) {
  window.setInterval(() => {
    contactSlides[contactSlideIndex].classList.remove('is-active');
    contactSlideIndex = (contactSlideIndex + 1) % contactSlides.length;
    contactSlides[contactSlideIndex].classList.add('is-active');
  }, 6000);
}

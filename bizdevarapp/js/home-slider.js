(function () {
  "use strict";

  var root = document.getElementById("heroSlider");
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll(".hero-slider__slide"));
  var dotsWrap = root.querySelector(".hero-slider__dots");
  var prevBtn = root.querySelector(".hero-slider__arrow--prev");
  var nextBtn = root.querySelector(".hero-slider__arrow--next");

  if (slides.length < 2) return;

  var index = 0;
  var timer = null;
  var interval = 5000;
  var paused = false;

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach(function (slide, n) {
      slide.classList.toggle("is-active", n === index);
      slide.setAttribute("aria-hidden", n === index ? "false" : "true");
    });
    var dots = dotsWrap ? dotsWrap.querySelectorAll(".hero-slider__dot") : [];
    dots.forEach(function (dot, n) {
      dot.classList.toggle("is-active", n === index);
    });
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function startAutoplay() {
    if (timer) window.clearInterval(timer);
    if (paused || slides.length < 2) return;
    timer = window.setInterval(next, interval);
  }

  function stopAutoplay() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  if (dotsWrap) {
    slides.forEach(function (_, n) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero-slider__dot" + (n === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Slayd " + (n + 1));
      dot.addEventListener("click", function () { goTo(n); startAutoplay(); });
      dotsWrap.appendChild(dot);
    });
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { prev(); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener("click", function () { next(); startAutoplay(); });

  root.addEventListener("touchstart", function () { paused = true; stopAutoplay(); }, { passive: true });
  root.addEventListener("touchend", function () { paused = false; startAutoplay(); }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAutoplay();
    else if (!paused) startAutoplay();
  });

  goTo(0);
  startAutoplay();
})();

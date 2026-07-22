(function () {
  "use strict";

  var API = window.BizdevarAPI;
  var STORAGE_KEY = "buykon_viewed_stories";
  var STORY_DURATION_MS = 5000;
  var strip = document.getElementById("homeStories");
  var track = document.getElementById("homeStoriesTrack");
  if (!strip || !track || !API || !API.stories) return;

  var viewer = null;
  var stories = [];
  var currentIndex = -1;
  var progressTimer = null;

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function setEmpty(empty) {
    strip.classList.toggle("home-stories--empty", empty);
  }

  function getViewed() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function markViewed(id) {
    var viewed = getViewed();
    var sid = String(id);
    if (viewed.indexOf(sid) === -1) {
      viewed.push(sid);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
      } catch (e) {}
    }
    var btn = track.querySelector('[data-story-id="' + sid + '"]');
    if (btn) btn.classList.add("is-viewed");
  }

  function mediaSrc(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    var base = (window.BizdevarSiteConfig && window.BizdevarSiteConfig.resolveApiBase()) || "";
    var origin = base.replace(/\/api\/?$/, "");
    if (url.charAt(0) === "/") return origin + url;
    return origin + "/" + String(url).replace(/^\/+/, "");
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : s;
    return d.innerHTML;
  }

  function normalizeLink(url) {
    if (!url) return "";
    var u = String(url).trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.charAt(0) === "/") return u;
    return "https://" + u;
  }

  function stopProgress() {
    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = null;
    }
  }

  function buildProgress(activeIdx) {
    var bar = viewer.querySelector("#storyViewerProgress");
    if (!bar) return;
    var html = "";
    for (var i = 0; i < stories.length; i++) {
      var state = i < activeIdx ? " is-done" : i === activeIdx ? " is-active" : "";
      html +=
        '<span class="story-viewer__seg' +
        state +
        '"><span class="story-viewer__seg-fill"></span></span>';
    }
    bar.innerHTML = html;
  }

  function startProgress() {
    stopProgress();
    if (!viewer || currentIndex < 0) return;

    buildProgress(currentIndex);
    var fill = viewer.querySelector(".story-viewer__seg.is-active .story-viewer__seg-fill");
    if (!fill) {
      progressTimer = setTimeout(onProgressEnd, STORY_DURATION_MS);
      return;
    }

    fill.style.width = "0%";
    fill.style.transition = "none";

    // Force reflow then animate
    void fill.offsetWidth;
    fill.style.transition = "width " + STORY_DURATION_MS + "ms linear";
    fill.style.width = "100%";

    progressTimer = setTimeout(onProgressEnd, STORY_DURATION_MS);
  }

  function onProgressEnd() {
    progressTimer = null;
    if (currentIndex < stories.length - 1) {
      showStory(currentIndex + 1);
    } else {
      closeViewer();
    }
  }

  function ensureViewer() {
    if (viewer) {
      document.body.appendChild(viewer);
      return viewer;
    }
    viewer = document.createElement("div");
    viewer.className = "story-viewer";
    viewer.innerHTML =
      '<div class="story-viewer__dialog" role="dialog" aria-modal="true" aria-label="Story">' +
      '<div class="story-viewer__progress" id="storyViewerProgress" aria-hidden="true"></div>' +
      '<button type="button" class="story-viewer__close" id="storyViewerClose" aria-label="Bağla">×</button>' +
      '<div class="story-viewer__media"><img class="story-viewer__image" id="storyViewerImage" alt="" /></div>' +
      '<div class="story-viewer__foot" id="storyViewerFoot">' +
      '<a class="story-viewer__link" id="storyViewerLink" href="#">Keçid et</a>' +
      "</div></div>";
    document.body.appendChild(viewer);

    viewer.querySelector("#storyViewerClose").addEventListener("click", function (e) {
      e.stopPropagation();
      closeViewer();
    });
    viewer.querySelector("#storyViewerLink").addEventListener("click", function (e) {
      var href = normalizeLink(this.getAttribute("href") || "");
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }
      this.setAttribute("href", href);
      closeViewer();
    });
    return viewer;
  }

  function showStory(index) {
    if (!stories.length || index < 0 || index >= stories.length) {
      closeViewer();
      return;
    }
    currentIndex = index;
    var story = stories[index];
    markViewed(story.id);

    var v = ensureViewer();
    document.body.appendChild(v);
    var img = v.querySelector("#storyViewerImage");
    img.removeAttribute("style");
    img.src = mediaSrc(story.image_url);
    img.alt = story.title || "Story";

    var link = v.querySelector("#storyViewerLink");
    var foot = v.querySelector("#storyViewerFoot");
    var linkUrl = normalizeLink(story.link_url);
    if (linkUrl) {
      link.href = linkUrl;
      link.hidden = false;
      if (foot) foot.hidden = false;
    } else {
      link.href = "#";
      link.hidden = true;
      if (foot) foot.hidden = true;
    }

    v.classList.add("is-open");
    document.body.style.overflow = "hidden";
    startProgress();
  }

  function openViewer(story) {
    if (!isMobile()) return;
    var idx = stories.findIndex(function (x) {
      return String(x.id) === String(story.id);
    });
    if (idx < 0) idx = 0;
    showStory(idx);
  }

  function closeViewer() {
    stopProgress();
    currentIndex = -1;
    if (!viewer) return;
    viewer.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function render() {
    if (!stories.length || !isMobile()) {
      setEmpty(true);
      track.innerHTML = "";
      return;
    }
    setEmpty(false);
    var viewed = getViewed();
    var html = "";
    stories.forEach(function (s) {
      var isViewed = viewed.indexOf(String(s.id)) !== -1;
      var title = s.title || "";
      html +=
        '<button type="button" class="home-stories__item' +
        (isViewed ? " is-viewed" : "") +
        '" data-story-id="' +
        esc(String(s.id)) +
        '" aria-label="' +
        esc(title || "Story") +
        '">' +
        '<img class="home-stories__thumb" src="' +
        esc(mediaSrc(s.image_url)) +
        '" alt="' +
        esc(title) +
        '" loading="lazy" decoding="async" />' +
        (title ? '<span class="home-stories__title">' + esc(title) + "</span>" : "") +
        "</button>";
    });
    track.innerHTML = html;

    track.querySelectorAll(".home-stories__item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-story-id");
        var story = stories.find(function (x) {
          return String(x.id) === String(id);
        });
        if (story) openViewer(story);
      });
    });
  }

  function load() {
    setEmpty(true);
    API.stories()
      .then(function (data) {
        stories = (data && data.items) || [];
        render();
      })
      .catch(function () {
        setEmpty(true);
        track.innerHTML = "";
      });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeViewer();
  });

  window.addEventListener("resize", function () {
    if (!isMobile()) closeViewer();
    render();
  });
  load();
})();

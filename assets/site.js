/* ==========================================================================
   mike-giardina.netlify.app — shared behaviour
   --------------------------------------------------------------------------
   Motion and the section rail, in one file for all six pages.

   Two rules govern everything here:

   1. Nothing is ever hidden by CSS that only JS can put back. The entrance
      states live behind .js-motion, which this file adds only when it is
      actually running AND motion is allowed. No JS, or reduced motion, and the
      page renders in its final state immediately.

   2. Nothing animates a property that triggers layout. Entrances use opacity
      and transform, figure reveals use clip-path, and the count-up writes
      into an element whose width is already reserved by tabular-nums.

   No dependencies. No build step.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;
  var root = document.documentElement;

  /* Motion is opt-in, and only this line turns it on. */
  if (!reduced && canObserve) root.classList.add('js-motion');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    var sections = [].slice.call(
      document.querySelectorAll('section.sec, section.section')
    );

    /* ---------------------------------------------------------------------
       Section rail — built from the page's own headings.
       It mirrors existing copy rather than introducing any, so the rail can
       never drift from the section titles it points at.
       --------------------------------------------------------------------- */
    (function buildRail() {
      var wrap = document.querySelector('.wrap');
      if (!wrap || document.querySelector('.rail')) return;

      var items = sections.filter(function (s) {
        return s.id && s.querySelector('h2');
      });
      if (items.length < 3) return;   // not enough structure to be worth a rail

      var nav = document.createElement('aside');
      nav.className = 'rail';
      nav.setAttribute('aria-label', 'Sections on this page');
      var ol = document.createElement('ol');

      items.forEach(function (s) {
        var numEl = s.querySelector('.secnum, .section-number');
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + s.id;
        if (numEl && numEl.textContent.trim()) {
          var n = document.createElement('span');
          n.className = 'rn';
          n.textContent = numEl.textContent.trim();
          a.appendChild(n);
        }
        a.appendChild(
          document.createTextNode(s.querySelector('h2').textContent.trim())
        );
        li.appendChild(a);
        ol.appendChild(li);
      });

      nav.appendChild(ol);
      wrap.insertBefore(nav, wrap.firstChild);

      if (!canObserve) return;
      var lis = [].slice.call(ol.children);
      var byId = {};
      lis.forEach(function (li, i) { byId[items[i].id] = li; });

      /* Active-section highlight. The band is the upper third of the
         viewport, so the rail marks the section you are reading rather than
         whichever one happens to be largest on screen. */
      var railObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          lis.forEach(function (l) { l.classList.remove('on'); });
          if (byId[e.target.id]) byId[e.target.id].classList.add('on');
        });
      }, { rootMargin: '-20% 0px -70% 0px' });

      items.forEach(function (s) { railObserver.observe(s); });
    })();

    if (!canObserve || reduced) return;   // everything below is motion only

    /* ---------------------------------------------------------------------
       Section reveal — drives the rule that draws under a heading and the
       figure wipe. Sections only ever gain a class, never lose one.
       --------------------------------------------------------------------- */
    var secObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          secObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    sections.forEach(function (s) { secObserver.observe(s); });

    /* ---------------------------------------------------------------------
       Staggered entrances.
       .rise is applied here rather than in the markup, so the six pages need
       no edits and a new card picks up the behaviour automatically.
       --------------------------------------------------------------------- */
    var RISE = [
      '.cards > *', '.studies > *', '.skills > *',
      '.apps-grid > *', '.contact-grid > *', '.panels > *',
      '.timeline-item', 'figure.fig', '.lane', '.barit', '.dcol', '.cmd'
    ].join(',');

    var risers = [].slice.call(document.querySelectorAll(RISE));
    risers.forEach(function (el) { el.classList.add('rise'); });

    /* The chart inside a figure wipes in behind the card. Marking the svg
       here rather than in the markup means the existing figures pick it up
       untouched. clip-path only — the svg never moves, so a long figure
       cannot shift the text below it while it reveals. */
    [].slice.call(document.querySelectorAll('figure.fig svg'))
      .forEach(function (svg) { svg.classList.add('reveal'); });

    var riseObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = [].slice.call(el.parentNode.children)
          .filter(function (n) { return n.classList.contains('rise'); });
        // cap the stagger so a long grid never leaves the last card waiting
        var i = Math.min(sibs.indexOf(el), 7);
        el.style.transitionDelay = (i * 65) + 'ms';
        el.classList.add('in');
        riseObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    risers.forEach(function (el) { riseObserver.observe(el); });

    /* Backstop: if an observer never fires for any reason, nothing may be
       left invisible. Cheap, runs once, and only ever reveals. */
    window.setTimeout(function () {
      risers.forEach(function (el) { el.classList.add('in'); });
    }, 3000);

    /* ---------------------------------------------------------------------
       Count-ups.
       Reads the value already in the element, so it needs no data attribute
       and cannot disagree with the copy. Anything non-numeric (L1, CEN,
       ATCN) is left exactly as authored.

       The animation writes INTERMEDIATE VALUES into the element, which makes
       it the one piece of decoration on this site that can put a false number
       on screen. requestAnimationFrame stops delivering frames in a background
       tab, so a count started just before the tab was backgrounded used to
       freeze partway and stay there: 28 rendered as 9, and nothing about it
       looked broken. Every path below therefore ends at the authored text --
       a visibility change, a backstop timer, or the animation finishing.
       --------------------------------------------------------------------- */
    [].slice.call(document.querySelectorAll('.stat .n, .stat-value'))
      .forEach(function (el) {
        var raw = el.textContent.trim();
        var m = raw.match(/^(\d[\d,]*)(\D*)$/);
        if (!m) return;                        // not a number — leave it alone
        var target = parseInt(m[1].replace(/,/g, ''), 10);
        var suffix = m[2] || '';
        if (!isFinite(target) || target === 0) return;
        if (reduced) return;                   // authored value, never animated

        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();

          var dur = 850, settled = false, backstop = null;

          function settle() {                  // the only way this ever ends
            if (settled) return;
            settled = true;
            clearTimeout(backstop);
            document.removeEventListener('visibilitychange', onVisibility);
            el.textContent = raw;              // restore the exact original
          }
          function onVisibility() {
            if (document.hidden) settle();     // never freeze mid-count
          }

          if (document.hidden) { settle(); return; }
          document.addEventListener('visibilitychange', onVisibility);
          // setTimeout still fires in a throttled tab; rAF may not.
          backstop = setTimeout(settle, dur + 500);

          var start = null;
          requestAnimationFrame(function step(ts) {
            if (settled) return;
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            var eased = 1 - Math.pow(1 - p, 3);   // decelerate into the value
            if (p < 1) {
              el.textContent = Math.round(target * eased).toLocaleString() +
                               suffix;            // suffix held so width is stable
              requestAnimationFrame(step);
            } else {
              settle();
            }
          });
        }, { threshold: 0.6 });
        io.observe(el);
      });

    /* ---------------------------------------------------------------------
       Section folds.
       Reference pages wrap each section body in <details class="fold">, so the
       default view is an index rather than a wall. Two things have to keep
       working once they do: a link to #cost has to OPEN the fold it lands in
       instead of scrolling to a collapsed heading, and the whole page has to
       be openable in one action for printing, or for a browser whose find
       does not reach into a closed <details>.

       No-op on every page that has no folds.
       --------------------------------------------------------------------- */
    var folds = [].slice.call(document.querySelectorAll('details.fold'));
    if (folds.length) {
      var bar = document.querySelector('.foldbar');

      function setAll(open) {
        folds.forEach(function (d) { d.open = open; });
      }
      if (bar) {
        bar.addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('[data-fold]') : null;
          if (!b) return;
          setAll(b.getAttribute('data-fold') === 'open');
        });
      }

      /* A hash can name the section itself, or anything inside its fold. */
      function revealHash() {
        var id = (location.hash || '').slice(1);
        if (!id) return;
        var el = document.getElementById(id);
        if (!el) return;

        var d = el.closest ? el.closest('details.fold') : null;
        if (!d && el.querySelector) d = el.querySelector('details.fold');
        while (d) {
          d.open = true;
          var p = d.parentNode;
          d = (p && p.closest) ? p.closest('details.fold') : null;
        }
        /* Opening a fold grows the document under the browser's own hash jump,
           which would otherwise leave the reader above the thing they asked
           for. Re-aim one frame later, after that growth has been laid out. */
        if (el.scrollIntoView) {
          if (window.requestAnimationFrame) {
            requestAnimationFrame(function () { el.scrollIntoView(); });
          } else {
            el.scrollIntoView();
          }
        }
      }

      window.addEventListener('hashchange', revealHash);
      document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var t = document.getElementById(id);
        if (!t) return;
        var d = t.closest ? t.closest('details.fold') : null;
        if (!d && t.querySelector) d = t.querySelector('details.fold');
        while (d) {
          d.open = true;
          var p = d.parentNode;
          d = (p && p.closest) ? p.closest('details.fold') : null;
        }
      });
      revealHash();
    }
  });
})();

/* ---------------------------------------------------------------------------
   Theme toggle.

   The stylesheet already ships BOTH themes: light is the base, dark is a
   designed variant driven by prefers-color-scheme, and :root[data-theme]
   forces either one. What was missing was anything to set that attribute --
   so the light theme existed, was fully styled, and was unreachable to
   anyone whose OS was set to dark.

   Applied before paint via the inline bootstrap in each page's <head>, so a
   stored preference does not flash the wrong theme on load.
   -------------------------------------------------------------------------- */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "mg-theme";

  function systemTheme() {
    return window.matchMedia &&
           window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function current() {
    return root.getAttribute("data-theme") || systemTheme();
  }
  function apply(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var b = document.querySelector(".theme-toggle");
    if (b) {
      b.setAttribute("aria-pressed", String(t === "dark"));
      b.setAttribute("title", t === "dark" ? "Switch to light" : "Switch to dark");
      b.textContent = t === "dark" ? "◑ light" : "◐ dark";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var host = document.querySelector(".topnav") || document.querySelector(".quicknav");
    if (!host) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-pressed", String(current() === "dark"));
    host.appendChild(btn);
    btn.addEventListener("click", function () {
      apply(current() === "dark" ? "light" : "dark");
    });
    apply(current());
  });

  // Follow the OS only while the reader has expressed no preference of their own.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      var stored = null;
      try { stored = localStorage.getItem(KEY); } catch (e) {}
      if (!stored) apply(systemTheme());
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();

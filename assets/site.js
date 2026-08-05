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
       --------------------------------------------------------------------- */
    [].slice.call(document.querySelectorAll('.stat .n, .stat-value'))
      .forEach(function (el) {
        var raw = el.textContent.trim();
        var m = raw.match(/^(\d[\d,]*)(\D*)$/);
        if (!m) return;                        // not a number — leave it alone
        var target = parseInt(m[1].replace(/,/g, ''), 10);
        var suffix = m[2] || '';
        if (!isFinite(target) || target === 0) return;

        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          var start = null, dur = 850;
          requestAnimationFrame(function step(ts) {
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            var eased = 1 - Math.pow(1 - p, 3);   // decelerate into the value
            el.textContent = Math.round(target * eased).toLocaleString() +
                             (p === 1 ? suffix : '');
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = raw;            // restore the exact original
          });
        }, { threshold: 0.6 });
        io.observe(el);
      });
  });
})();

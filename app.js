(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  toggle.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    toggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark';
  });
  const folds = [...document.querySelectorAll('details.fold')];
  document.querySelectorAll('.tablewrap').forEach(table => {
    table.tabIndex = 0;
    table.setAttribute('role','region');
    table.setAttribute('aria-label','Data table, scroll horizontally to see all columns');
    const hint = document.createElement('p');
    hint.className = 'table-scroll-label';
    hint.textContent = 'Scroll table horizontally to see all columns →';
    table.after(hint);
  });
  document.querySelectorAll('[data-fold]').forEach(button => {
    button.addEventListener('click', () => {
      folds.forEach(fold => { fold.open = button.dataset.fold === 'open'; });
      updateProgress();
    });
  });
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let parent = target.closest('details');
    while (parent) {
      parent.open = true;
      parent = parent.parentElement.closest('details');
    }
    target.querySelector('details.fold')?.setAttribute('open', '');
    requestAnimationFrame(() => target.scrollIntoView({behavior:'instant',block:'start'}));
  }
  window.addEventListener('hashchange', revealHash);
  // Re-clicking a deep link must also reopen a section the reader has collapsed.
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    if (a.hash === location.hash) revealHash();
  }));
  revealHash();
  const sections = [...document.querySelectorAll('section.sec')];
  const links = [...document.querySelectorAll('.contents-rail nav a')];
  const progress = document.querySelector('.reading-progress');
  let pending = false;
  function updateProgress() {
    const max = root.scrollHeight - innerHeight;
    progress.style.width = `${max > 0 ? Math.min(100,scrollY / max * 100) : 0}%`;
    const current = sections.filter(s => s.getBoundingClientRect().top < innerHeight * .4).at(-1);
    links.forEach(a => {
      const active = a.hash === '#' + current?.id;
      a.classList.toggle('active',active);
      if (active) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
    pending = false;
  }
  addEventListener('scroll', () => {if (!pending) { pending = true;requestAnimationFrame(updateProgress); }}, {passive:true});
  addEventListener('resize',updateProgress);
  folds.forEach(f => f.addEventListener('toggle',updateProgress));
  updateProgress();
  document.querySelector('.back-top')?.addEventListener('click', () => scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));
  let printState;
  addEventListener('beforeprint', () => {
    printState = [...document.querySelectorAll('details')].map(f => [f, f.open]);
    printState.forEach(([f]) => f.open = true);
  });
  addEventListener('afterprint', () => printState?.forEach(([f,open]) => f.open = open));
  document.querySelector('.print-button')?.addEventListener('click', () => print());
})();

(() => {
  const menu = document.querySelector('.mobile-menu');
  const nav = document.querySelector('#primary-navigation');
  menu?.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    nav.classList.toggle('menu-open', expanded);
  });
  const closeMenus = () => {
    document.querySelectorAll('.nav-dropdown[open]').forEach(d => d.open = false);
    menu?.setAttribute('aria-expanded','false');
    nav?.classList.remove('menu-open');
  };
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeMenus(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.masthead')) closeMenus();
  });
  document.querySelectorAll('.nav-dropdown').forEach(d => d.addEventListener('toggle', () => {
    if(d.open) document.querySelectorAll('.nav-dropdown').forEach(other => {if(other !== d)other.open=false;});
  }));
  // Story scripts remain original. This handler only controls their surrounding reading theme.
  if(document.body.classList.contains('story-page')) {
    const toggle=document.querySelector('.theme-toggle');
    toggle.addEventListener('click',()=> {
      const dark=document.documentElement.dataset.theme!=='dark';
      document.documentElement.dataset.theme=dark?'dark':'light';
      toggle.setAttribute('aria-label',`Switch to ${dark?'light':'dark'} mode`);
      toggle.querySelector('.theme-label').textContent=dark?'Light':'Dark';
    });
  }
  document.querySelectorAll('a[href*="#"]').forEach(a=>a.addEventListener('click',()=>{
    if(a.pathname===location.pathname)closeMenus();
  }));
})();

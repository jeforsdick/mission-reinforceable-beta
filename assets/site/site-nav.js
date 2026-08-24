(() => {
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.nav-toggle');
  const menu = header?.querySelector('.nav-menu');

  if (!header || !toggle || !menu) return;

  const mobileBrandStyle = document.createElement('style');
  mobileBrandStyle.textContent = '@media (max-width: 700px) { .brand-logo { width: clamp(125px, 38vw, 165px); } }';
  document.head.append(mobileBrandStyle);

  header.classList.add('nav-enhanced');
  toggle.hidden = false;

  const closeMenu = () => {
    toggle.parentElement.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  };

  toggle.addEventListener('click', () => {
    const opening = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.parentElement.classList.toggle('is-open', opening);
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute('aria-label', opening ? 'Close navigation menu' : 'Open navigation menu');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
})();

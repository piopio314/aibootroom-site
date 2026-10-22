/* AI Boot Room — the one site menu for every page (owner 2026-10-22): the same items everywhere, "AI Picks" highlighted,
   and on phones a menu button that opens the full menu (it used to disappear below 900 px). Pages only need
   <header class="nav"><div class="wrap"><a class="logo">…</a> … </div></header> and this script. */
(function () {
  const ITEMS = [
    ['/picks.html', 'AI Picks', 'picks'],
    ['/#weekend', 'This weekend'],
    ['/match.html', 'Match shows'],
    ['/#movers', 'Market movers'],
    ['/#bootroom', 'Latest reads'],
    ['/#videos', 'Videos'],
    ['/#receipts', 'Receipts'],
    ['/media.html', 'Media check'],
  ];
  const here = location.pathname.replace(/index\.html$/, '');

  function build(header) {
    const wrap = header.querySelector('.wrap');
    if (!wrap || wrap.dataset.menu) return;
    wrap.dataset.menu = '1';
    let nav = wrap.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      const logo = wrap.querySelector('.logo');
      logo ? logo.after(nav) : wrap.prepend(nav);
    }
    nav.id = 'siteNav';
    nav.setAttribute('aria-label', 'Sections');
    nav.innerHTML = ITEMS.map(([href, label, cls]) => {
      const on = href === here || (href !== '/' && !href.includes('#') && here.endsWith(href));
      return `<a href="${href}"${cls ? ` class="${cls}"` : ''}${on ? ' aria-current="page"' : ''}>${cls === 'picks' ? '<span class="dot"></span>' : ''}${label}</a>`;
    }).join('');
    // phones: the AI Picks pill stays in the bar, everything else sits behind the menu button
    const pill = document.createElement('a');
    pill.href = '/picks.html'; pill.className = 'picks-m'; pill.innerHTML = '<span class="dot"></span>AI Picks';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'menu-btn'; btn.setAttribute('aria-label', 'Open the menu');
    btn.setAttribute('aria-controls', 'siteNav'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    wrap.append(pill, btn);
    const close = () => { header.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open the menu'); };
    btn.addEventListener('click', () => {
      const open = header.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    });
    nav.addEventListener('click', ev => { if (ev.target.closest('a')) close(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
    document.addEventListener('click', ev => { if (!header.contains(ev.target)) close(); });
  }
  const run = () => document.querySelectorAll('header.nav').forEach(build);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();

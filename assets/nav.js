/* AI Boot Room — the one site menu for every page (owner 2026-10-22): the same items everywhere, one item highlighted,
   and on phones a menu button that opens the full menu. Pages only need
   <header class="nav"><div class="wrap"><a class="logo">…</a> … </div></header> and this script.
   v2.63 (owner 2026-10-25): the site is the model's picks; pages of the previous system stay at their addresses with
   an "archive" banner and noindex (OLD below). */
(function () {
  const ITEMS = [
    ['/', 'Picks'],
    ['/record.html', 'Record', 'picks'],
    ['/weekly.html', 'Weekly'],
    ['/method.html', 'How it works'],
    ['/simulation.html', 'Simulation'],
  ];
  const PILL = ['/record.html', 'Record'];
  const here = location.pathname.replace(/index\.html$/, '');
  const OLD = /^\/(m|n|receipts)\/|^\/(read|match|media|picks)\.html$/;

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
      const on = href === here || (href !== '/' && here.endsWith(href));
      return `<a href="${href}"${cls ? ` class="${cls}"` : ''}${on ? ' aria-current="page"' : ''}>${cls === 'picks' ? '<span class="dot"></span>' : ''}${label}</a>`;
    }).join('');
    // phones: the AI Picks pill stays in the bar, everything else sits behind the menu button
    const pill = document.createElement('a');
    pill.href = PILL[0]; pill.className = 'picks-m'; pill.innerHTML = '<span class="dot"></span>' + PILL[1];
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
  function oldBanner(header) {
    if (!OLD.test(location.pathname) || document.querySelector('.old-system')) return;
    if (!document.querySelector('meta[name="robots"]')) {
      const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m);
    }
    const b = document.createElement('div');
    b.className = 'old-system';
    b.setAttribute('style', 'background:#2a2110;border-bottom:1px solid #5a4210;color:#ffe2a6;font:600 14px/1.45 Inter,system-ui,sans-serif;padding:10px 16px;text-align:center');
    b.innerHTML = 'Archive: this page is from the previous AI Boot Room system and is no longer updated. ' +
      '<a href="/" style="color:#ffb020;text-decoration:underline">See the live model picks</a>';
    header.after(b);
  }
  const run = () => document.querySelectorAll('header.nav').forEach(h => { build(h); oldBanner(h); });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();

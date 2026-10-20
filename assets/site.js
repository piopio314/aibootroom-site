/* AI Boot Room — shared helpers for the homepage and read pages. Data comes from our own JSON files only. */
const TZ = 'Europe/Madrid';
const ABR = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c])); },
  when(iso, long) {
    const d = new Date(iso);
    const o = long ? {weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'}
                   : {weekday: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'};
    return d.toLocaleString('en-GB', {timeZone: TZ, ...o});
  },
  ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    return m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
  },
  short(n) {
    const map = {'Borussia Dortmund': 'Dortmund', 'Eintracht Frankfurt': 'Frankfurt', 'Paris Saint Germain': 'PSG', 'Manchester City': 'Man City',
      'Manchester United': 'Man United', 'Atletico Madrid': 'Atlético', 'Deportivo La Coruna': 'Deportivo', 'Nottingham Forest': "Nott'm Forest",
      'Wolverhampton Wanderers': 'Wolves', 'Bayer Leverkusen': 'Leverkusen', 'Bayern München': 'Bayern', 'PSV Eindhoven': 'PSV'};
    return map[n] || n;
  },
  hue(s) { return [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7); },
  mono(n, size) {
    const ini = ABR.short(n).replace(/[^A-Za-zÀ-ž ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
    return `<span class="mono" style="background:hsl(${ABR.hue(n)} 52% 36%);${size ? `width:${size}px;height:${size}px;font-size:${Math.round(size / 3)}px` : ''}" aria-hidden="true">${ABR.esc(ini)}</span>`;
  },
  sign(v, d = 1) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d); },
  bar(m) {
    const f = m.fair, s = ABR.short;
    return `<div class="bar3" role="img" aria-label="${ABR.esc(`${m.home} ${f.home}%, draw ${f.draw}%, ${m.away} ${f.away}%`)}"><i class="h" style="width:${f.home}%"></i><i class="d" style="width:${f.draw}%"></i><i class="a" style="width:${f.away}%"></i></div>
      <div class="pcts"><span style="color:var(--home)">${ABR.esc(s(m.home))} ${f.home.toFixed(0)}%</span><span>Draw ${f.draw.toFixed(0)}%</span><span style="color:var(--away)">${f.away.toFixed(0)}% ${ABR.esc(s(m.away))}</span></div>`;
  },
  biggest(m) { const h = m.move.home, a = m.move.away; return Math.abs(h) >= Math.abs(a) ? {team: m.home, side: 'home', d: h} : {team: m.away, side: 'away', d: a}; },
  /* one team's win probability over time; y-window at least 8 pts so noise does not look like a cliff */
  spark(m, side) {
    const tl = (m.timeline || []).filter(p => p[side] != null);
    if (tl.length < 2) return '';
    const w = 520, h = 110, v = tl.map(p => p[side]), mid = (Math.max(...v) + Math.min(...v)) / 2;
    const half = Math.max(4, (Math.max(...v) - Math.min(...v)) / 2 + 1), lo = mid - half, hi = mid + half;
    const t0 = new Date(tl[0].t), t1 = new Date(tl[tl.length - 1].t), span = Math.max(1, t1 - t0);
    const x = p => 10 + (new Date(p.t) - t0) / span * (w - 20), y = val => 10 + (hi - val) / (hi - lo) * (h - 20);
    const col = side === 'home' ? 'var(--home)' : side === 'away' ? 'var(--away)' : 'var(--muted)';
    const pts = tl.map(p => `${x(p).toFixed(1)},${y(p[side]).toFixed(1)}`).join(' ');
    const last = tl[tl.length - 1];
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="win probability over time">
      <polyline points="${pts} ${x(last).toFixed(1)},${h} 10,${h}" fill="${col}" opacity=".10"/>
      <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(last).toFixed(1)}" cy="${y(last[side]).toFixed(1)}" r="5" fill="${col}" stroke="#121821" stroke-width="2"/></svg>`;
  },
  PERSONAS: {
    scout:   {emoji: '🔭', bg: '#12324f', name: 'The Scout', role: 'Finds the move', desc: 'Reads every price, every hour. Spots where the market moved first — and can’t wait to tell you about it.'},
    sceptic: {emoji: '🧐', bg: '#3d1c22', name: 'The Sceptic', role: 'Tries to break it', desc: 'Treats every move as noise until proven otherwise. Weak stories don’t survive the Sceptic.'},
    gaffer:  {emoji: '🎩', bg: '#3a2c09', name: 'The Gaffer', role: 'Makes the call', desc: 'Hears both sides and settles the reading. Withdraws a pick before kick-off if the news turns.'},
  },
  async json(url) { const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now()); if (!r.ok) throw new Error(r.status); return r.json(); },
};

// ── video overlay: YouTube (privacy-enhanced embed, loaded only on click) or our match show (Remotion Player)
ABR.playVideo = async function (v) {
  let box = document.getElementById('vbox');
  if (!box) {
    box = document.createElement('div'); box.id = 'vbox'; box.className = 'vbox';
    box.innerHTML = '<div class="vpanel"><button class="vclose" aria-label="Close">✕</button><div class="vstage"></div><div class="vfoot"></div></div>';
    document.body.append(box);
    box.addEventListener('click', ev => { if (ev.target === box || ev.target.closest('.vclose')) ABR.closeVideo(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') ABR.closeVideo(); });
  }
  const stage = box.querySelector('.vstage');
  box.querySelector('.vfoot').innerHTML = `<b>${ABR.esc(ABR.short(v.home))} v ${ABR.esc(ABR.short(v.away))}</b>
    <a class="btn ghost sm" href="match.html?m=${encodeURIComponent(v.id)}">Scenes and all matches →</a>`;
  box.classList.add('on'); document.body.style.overflow = 'hidden';
  if (v.youtube_id) {
    stage.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube_id)}?autoplay=1&rel=0&playsinline=1"
      title="${ABR.esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    return;
  }
  stage.innerHTML = '<div class="skeleton">Loading the match show…</div>';
  if (!window.ABRShow) await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'assets/show.js'; s.onload = ok; s.onerror = bad; document.head.append(s); });
  const show = await ABR.json(`data/shows/${v.id}.json`);
  stage.innerHTML = '';
  ABR._show = window.ABRShow.mount(stage, show);
  setTimeout(() => ABR._show && ABR._show.play(), 300);
};
ABR.closeVideo = function () {
  const box = document.getElementById('vbox'); if (!box) return;
  if (ABR._show) { ABR._show.destroy(); ABR._show = null; }
  box.querySelector('.vstage').innerHTML = ''; box.classList.remove('on'); document.body.style.overflow = '';
};
ABR.json('data/videos.json').then(v => { if (v.has_youtube) document.querySelectorAll('[data-yt]').forEach(a => a.hidden = false); }).catch(() => {});

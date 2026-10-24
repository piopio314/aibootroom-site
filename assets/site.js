/* AI Boot Room — shared helpers for the homepage and read pages. Data comes from our own JSON files only. */
const TZ = 'Europe/Madrid';
const ABR = {
  // icons: Tabler (MIT) sprite built by tools/brand/icons.py — no emoji anywhere on the site (owner 2026-10-22)
  ic(name, cls = '') { return `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="/assets/icons.svg#i-${name}"></use></svg>`; },
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
  // one AI pick as a card (homepage + picks page): our poster → YouTube, the pick, market vs ours, hook, reasons, risk, receipt
  VERDICTS: {RIGHT: 'Right — won, and the market moved toward the pick before kick-off', LUCKY: 'Lucky — won, but the market moved away from the pick',
             UNLUCKY: 'Unlucky — lost, but the market moved toward the pick', WRONG: 'Wrong — lost, and the market moved away from the pick', PUSH: 'Push — stake back'},
  HELD: {yes: ['check', 'held'], no: ['x', 'did not hold'], unclear: ['zoom-question', 'unclear']},
  // after the match: every published reason with whether it held on the pitch, then the risk
  pickVerdict(p, units) {
    const E = ABR.esc;
    return `<div class="pverdict v-${E(p.verdict.toLowerCase())}"><b>${E(p.score ? p.score + ' · ' : '')}${E(ABR.VERDICTS[p.verdict] || p.verdict)}</b> ${units}${p.receipt ? `<span>${E(p.receipt)}</span>` : ''}</div>`;
  },
  pickChecks(p) {
    const E = ABR.esc, H = ABR.HELD;
    if (!(p.checks || []).length) return '';
    const n = p.checks.filter(c => c.held === 'yes').length;
    const li = p.checks.map(c => { const h = H[c.held] || H.unclear;
      return `<li class="h-${E(c.held)}">${ABR.ic(h[0])}<div><b>${E(c.say || c.label)}</b><span>${E(h[1])}: ${E(c.note || '')}</span></div></li>`; }).join('');
    const r = p.risk_check, rh = r ? ({yes: 'it happened', no: 'it did not happen', unclear: 'unclear'})[r.happened] || 'unclear' : '';
    return `<div class="pchecks"><div class="pck-h">Our reasons after the match · ${n} of ${p.checks.length} held</div><ul>${li}</ul>
      ${r ? `<p class="prisk"><b>The risk we named:</b> ${E(r.say || '')} <span class="rk rk-${E(r.happened)}">${E(rh)}</span> ${E(r.note || '')}</p>` : ''}</div>`;
  },
  pickCard(p, i) {
    const E = ABR.esc, S = ABR.short;
    const units = p.pnl != null ? `<b class="${p.pnl > 0 ? 'up' : p.pnl < 0 ? 'down' : ''}">${p.pnl > 0 ? '+' : ''}${p.pnl.toFixed(2)} u</b>` : '';
    return `<article class="pick">
      <button class="ppost" data-pick="${i}" aria-label="Play the ${E(S(p.home))} v ${E(S(p.away))} pick video">
        ${p.poster ? `<img src="${E(p.poster)}" alt="" loading="lazy">` : `<span class="pnone">${E(p.selection)}</span>`}
        ${p.youtube_id ? `<span class="pp">${ABR.ic('player-play-filled')}</span>` : ''}</button>
      <div class="pbody">
        <div class="top"><span class="chip">${E(p.league || '')}</span><span class="when">${E(ABR.when(p.kickoff))}</span></div>
        <h3>${E(S(p.home))} v ${E(S(p.away))}</h3>
        <div class="psel"><b>${E(p.selection)}</b><span>@ ${p.odds.toFixed(2)}</span></div>
        ${p.our_pct != null ? `<div class="pch">Market <b>${p.market_pct_when_set}%</b> · ours <b class="ours">${p.our_pct}%</b></div>` : ''}
        ${p.hook ? `<p class="phook">${E(p.hook)}</p>` : ''}
        ${(p.checks || []).length ? ABR.pickVerdict(p, units) + ABR.pickChecks(p) : `${(p.reasons || []).length ? `<ol class="pwhy">${p.reasons.map(r => `<li>${E(r)}</li>`).join('')}</ol>` : ''}
        ${p.risk ? `<p class="prisk"><b>The risk:</b> ${E(p.risk)}</p>` : ''}`}
        ${p.verdict ? ((p.checks || []).length ? '' : ABR.pickVerdict(p, units))
          : `<div class="pstamp">Published ${E(ABR.when(p.published_at || p.set_at, true))} · ${p.hours_before_kickoff >= 48 ? (p.hours_before_kickoff / 24).toFixed(1) + ' days' : Math.round(p.hours_before_kickoff) + ' h'} before kick-off · final</div>`}
      </div></article>`;
  },
  bindPickCards(box, list) {
    box.addEventListener('click', ev => {
      const b = ev.target.closest('[data-pick]'); if (!b) return;
      const p = list[+b.dataset.pick]; if (!p || !p.youtube_id) return;
      ABR.playVideo({id: '', title: p.title || p.selection, home: p.home, away: p.away, youtube_id: p.youtube_id});
    });
  },
  async json(url) { const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now()); if (!r.ok) throw new Error(r.status); return r.json(); },
};

// ── video overlay: YouTube (privacy-enhanced embed, loaded only on click) or our match show (Remotion Player)
ABR.playVideo = async function (v) {
  let box = document.getElementById('vbox');
  if (!box) {
    box = document.createElement('div'); box.id = 'vbox'; box.className = 'vbox';
    box.innerHTML = '<div class="vpanel"><button class="vclose" aria-label="Close"><svg class="i" aria-hidden="true"><use href="/assets/icons.svg#i-x"></use></svg></button><div class="vstage"></div><div class="vfoot"></div></div>';
    document.body.append(box);
    box.addEventListener('click', ev => { if (ev.target === box || ev.target.closest('.vclose')) ABR.closeVideo(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') ABR.closeVideo(); });
  }
  const stage = box.querySelector('.vstage');
  box.classList.toggle('wide', !!v.wide);          // a roundup is a 16:9 long video
  box.querySelector('.vfoot').innerHTML = v.wide ? `<b>${ABR.esc(v.title || '')}</b>`
    : `<b>${ABR.esc(ABR.short(v.home))} v ${ABR.esc(ABR.short(v.away))}</b>
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

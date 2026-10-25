/* AI Boot Room — the model site (v2.63). Renders every page from /data/model.json (live picks, written by
   tools/neurobet2/site.py) and /data/simulation.json (backtest/neurobet2_site_sim.py). Page = <body data-page="…">.
   Owner 2026-10-25: home variant A "the board"; no expectation band, no losing-run statistics; CLV only as grey
   information; never "neural network"; no bookmaker names; 18+. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const ic = n => `<svg class="i" aria-hidden="true"><use href="/assets/icons.svg#i-${n}"></use></svg>`;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";
  const sgn = (x, d = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(d);
  const fmtLine = l => l === 0 ? "0" : (l > 0 ? "+" : "−") + Math.abs(l);
  const cls = x => x > 0 ? "up" : x < 0 ? "down" : "";
  const TZ = "Europe/Madrid";
  const fmt = (iso, o) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o }).format(new Date(iso));
  const dayKey = iso => fmt(iso, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
  const dayShort = iso => fmt(iso, { weekday: "short", day: "numeric", month: "short" });
  const dayLong = iso => fmt(iso, { weekday: "long", day: "numeric", month: "long" });
  const hm = iso => fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
  const when = iso => `${dayShort(iso)} · ${hm(iso)}`;

  let D = null, S = null;
  const LG = {}; // code → [name, country]

  /* ───────── components ───────── */
  const lgChip = c => `<span class="chip lg"><b>${LG[c][1]}</b>${esc(LG[c][0])}</span>`;
  function cmp(p) {
    const sc = v => Math.max(4, Math.min(100, (v - 0.30) / 0.35 * 100));
    return `<div class="cmp"><span class="k">Market</span><span class="b m"><i style="width:${sc(p.mkt)}%"></i></span><span class="n">${pct(p.mkt)}</span>
      <span class="k">Model</span><span class="b o"><i style="width:${sc(p.model)}%"></i></span><span class="n" style="color:var(--accent)">${pct(p.model)}</span></div>`;
  }
  const teams = p => `<div class="teams"><span class="${p.side === "h" ? "me" : ""}">${esc(p.home)}</span><span class="vs">vs</span><span class="${p.side === "a" ? "me" : ""}">${esc(p.away)}</span></div>`;
  const score = p => p.score ? `${p.score[0]}–${p.score[1]}` : "";
  function resLine(p) {
    if (p.state === "void") return `<div class="res"><span class="chip">${ic("arrow-back-up")} Void</span><span class="mut">match not played, stake returned</span></div>`;
    if (p.state === "playing") return `<div class="lockline">${ic("clock")} Pick #${p.n} · match under way, settled after the final whistle</div>`;
    return `<div class="res"><span class="sc">${score(p)}</span><span class="chip ${p.k === "won" ? "g" : p.k === "lost" ? "r" : ""}">${ic(p.k === "won" ? "check" : p.k === "lost" ? "x" : "arrow-back-up")} ${p.label}</span>
      <b class="${cls(p.u)}">${sgn(p.u, 2)} u</b>${p.close ? `<span class="mut">closing price ${p.close.toFixed(2)}${p.clv != null ? ` · CLV ${sgn(p.clv)}%` : ""}</span>` : ""}</div>`;
  }
  function card(p, o = {}) {
    const done = p.state === "settled" || p.state === "void" || p.state === "playing";
    return `<a class="pk ${o.big ? "big" : ""} ${p.state === "settled" ? p.k : ""}" href="/pick.html?n=${p.n}">
      <div class="top">${lgChip(p.lg)}<span class="sp"></span><span class="t">${when(p.ko)}</span></div>
      ${teams(p)}
      <div class="sel"><span class="lab">PICK</span><span class="v">${esc(p.team)} ${fmtLine(p.line)}</span><span class="ah">Asian handicap</span></div>
      <div><div class="mut" style="font-size:12px;margin-bottom:4px">Chance to cover the line</div>${cmp(p)}</div>
      <div class="meta"><span>Reference price <b>${p.price.toFixed(2)}</b></span><span>${ic("clock")} Published ${when(p.pub)} · ${Math.round(p.hb)} h before</span></div>
      ${p.why ? `<div class="why">${esc(p.why)}</div>` : ""}
      ${done ? resLine(p) : `<div class="lockline">${ic("lock")} Pick #${p.n} · final at publication, settled after the match</div>`}
    </a>`;
  }
  function emptyLeague(l) {
    let bar = "";
    for (let i = 1; i <= 10; i++) bar += `<i class="${i <= Math.min(l.md || 0, 10) - 1 ? "f" : i === 10 ? "t" : ""}"></i>`;
    return `<div class="empty"><div class="ico">${ic("hourglass")}</div><div><b>No picks before matchday 10 in ${esc(l.name)}</b>
      <p>The model waits until every team has played 9 league matches this season.${l.start ? ` Picks start with the matches of ${dayLong(l.start)}.` : ""}</p><div class="mdbar">${bar}</div></div></div>`;
  }
  const emptyRound = l => `<div class="empty"><div class="ico">${ic("target")}</div><div><b>No pick in ${esc(l.name)} this round</b>
      <p>The model priced the matches of the next three days. None was far enough from the market price. That is part of the record too: nothing is chosen by hand.</p></div></div>`;
  const STATE_TXT = {
    picks: l => [`var(--green)`, `${l.open} open pick${l.open === 1 ? "" : "s"}`],
    waiting: l => [`var(--muted)`, l.start ? `from ${dayShort(l.start)}` : `from matchday 10`],
    no_pick: () => [`var(--accent)`, `no pick this round`],
    not_priced: () => [`var(--accent)`, `next matches priced 1–2 days before`],
    no_matches: l => [`var(--accent)`, l.start ? `next round ${dayShort(l.start)}` : `no matches in the next 3 days`],
    unknown: () => [`var(--muted)`, `fixtures not out yet`]
  };
  const leagueStatus = () => `<div class="lstat">${D.leagues.map(l => {
    const [col, st] = (STATE_TXT[l.state] || STATE_TXT.unknown)(l);
    return `<div><span class="dot" style="background:${col}"></span><span class="nm">${esc(l.name)}</span><span class="st">${st}</span></div>`;
  }).join("")}</div>`;
  const settled = () => D.picks.filter(p => p.state === "settled").sort((a, b) => a.ko.localeCompare(b.ko));
  const open = () => D.picks.filter(p => p.state === "open" || p.state === "playing").sort((a, b) => a.ko.localeCompare(b.ko) || a.n - b.n);
  function agg(list) {
    const n = list.length, u = list.reduce((s, p) => s + p.u, 0), cl = list.filter(p => p.clv != null);
    return { n, u, y: n ? u / n : 0, w: list.filter(p => p.k === "won").length, l: list.filter(p => p.k === "lost").length,
      p: list.filter(p => p.k === "push").length, clv: cl.length ? cl.reduce((s, p) => s + p.clv, 0) / cl.length : null };
  }
  function kpis(rec) {
    const R = D.record;
    if (!rec.n) return `<div class="kpis">
      <div class="kpi"><div class="l">Live picks</div><div class="v">0</div><div class="s">${D.live_since ? "first results soon" : "live picks start soon"}</div></div>
      <div class="kpi"><div class="l">Units</div><div class="v mut">—</div><div class="s">1 unit per pick</div></div>
      <div class="kpi"><div class="l">Yield</div><div class="v mut">—</div><div class="s">units ÷ picks</div></div>
      <div class="kpi"><div class="l">Open now</div><div class="v">${R.open}</div><div class="s">published, not played yet</div></div></div>`;
    return `<div class="kpis">
      <div class="kpi"><div class="l">Live picks</div><div class="v">${rec.n}</div><div class="s">${rec.w} won · ${rec.l} lost · ${rec.p} push</div></div>
      <div class="kpi"><div class="l">Units</div><div class="v ${cls(rec.u)}">${sgn(rec.u)}</div><div class="s">1 unit per pick</div></div>
      <div class="kpi"><div class="l">Yield</div><div class="v ${cls(rec.y)}">${sgn(rec.y * 100)}%</div><div class="s">units ÷ picks</div></div>
      <div class="kpi"><div class="l">Open now</div><div class="v">${R.open}</div><div class="s">published, not played yet</div></div></div>`;
  }

  /* ───────── charts ───────── */
  function liveChart(list, o = {}) {
    const W = o.W || 720, H = o.H || 240, pl = 40, pr = 14, pt = 14, pb = 26;
    let c = 0; const ys = list.map(p => c += p.u);
    const N = Math.max(ys.length, 20);
    let ymax = Math.max(5, ...ys), ymin = Math.min(-5, ...ys);
    const step = ymax - ymin > 80 ? 20 : ymax - ymin > 30 ? 10 : 5;
    ymax = Math.ceil(ymax / step) * step; ymin = Math.floor(ymin / step) * step;
    const X = i => pl + (i / N) * (W - pl - pr), Y = v => pt + (ymax - v) / (ymax - ymin) * (H - pt - pb);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Live units, pick by pick">`;
    for (let v = ymin; v <= ymax; v += step) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? "#5b6b82" : "#1c2633"}" stroke-width="${v === 0 ? 1.2 : 1}"/><text x="${pl - 6}" y="${Y(v) + 4}" fill="#8796ab" font-size="11" text-anchor="end">${v > 0 ? "+" : ""}${v}</text>`;
    const xs = N > 400 ? 100 : N > 120 ? 50 : N > 40 ? 20 : 5;
    for (let i = 0; i <= N; i += xs) s += `<text x="${X(i)}" y="${H - 6}" fill="#8796ab" font-size="11" text-anchor="middle">${i}</text>`;
    if (ys.length) {
      let d = `M${X(0)},${Y(0)}`; ys.forEach((v, i) => d += `L${X(i + 1).toFixed(1)},${Y(v).toFixed(1)}`);
      s += `<path d="${d}" stroke="#f4f7fb" stroke-width="2.2" fill="none" stroke-linejoin="round"/>`;
      const lx = X(ys.length), ly = Y(ys[ys.length - 1]), anchor = lx > W - 80 ? "end" : "start";
      s += `<circle cx="${lx}" cy="${ly}" r="4.5" fill="#f4f7fb"/><text x="${anchor === "end" ? lx - 8 : lx + 8}" y="${ly - 9}" fill="#f4f7fb" font-size="12" font-weight="700" text-anchor="${anchor}">${sgn(ys[ys.length - 1])} u</text>`;
    } else s += `<text x="${(pl + W - pr) / 2}" y="${H / 2}" fill="#b8c4d4" font-size="13" text-anchor="middle">The live line starts with the first settled pick</text>`;
    return s + `<text x="${W - pr}" y="${H - pb - 6}" fill="#8796ab" font-size="10.5" text-anchor="end">picks</text></svg>`;
  }
  function simChart() {
    const W = 760, H = 260, pl = 44, pr = 12, pt = 12, pb = 28, wk = S.weeks;
    let cum = 0; const ys = wk.map(w => cum += w[2]);
    const ymax = Math.ceil((Math.max(...ys) + 20) / 50) * 50, ymin = Math.floor(Math.min(0, ...ys) / 50) * 50;
    const X = i => pl + i / (wk.length - 1) * (W - pl - pr), Y = v => pt + (ymax - v) / (ymax - ymin) * (H - pt - pb);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Simulated units by week">`;
    for (let v = ymin; v <= ymax; v += 50) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? "#5b6b82" : "#1c2633"}"/><text x="${pl - 6}" y="${Y(v) + 4}" fill="#8796ab" font-size="11" text-anchor="end">${v > 0 ? "+" : ""}${v}</text>`;
    let last = "";
    wk.forEach((w, i) => { const yr = +w[0].slice(0, 4), mo = +w[0].slice(5, 7), season = mo >= 7 ? yr : yr - 1; if (season !== last) { last = season; const a = String(season).slice(2), b = String(season + 1).slice(2); s += `<line x1="${X(i)}" x2="${X(i)}" y1="${pt}" y2="${H - pb}" stroke="#1c2633"/><text x="${X(i) + 4}" y="${H - 8}" fill="#8796ab" font-size="11">${a}/${b}</text>`; } });
    let d = ""; ys.forEach((v, i) => d += `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    s += `<path d="${d}L${X(ys.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z" fill="rgba(181,140,255,.12)"/><path d="${d}" stroke="#b58cff" stroke-width="2" fill="none"/>`;
    return s + `<text x="${X(ys.length - 1) - 4}" y="${Y(ys[ys.length - 1]) - 8}" fill="#b58cff" font-size="12" font-weight="700" text-anchor="end">${sgn(ys[ys.length - 1])} u</text></svg>`;
  }
  const byDay = list => { const m = new Map(); list.forEach(p => { const k = dayKey(p.ko); if (!m.has(k)) m.set(k, []); m.get(k).push(p); }); return m; };
  const ORDER = () => D.leagues.map(l => l.c);

  /* ───────── pages ───────── */
  function pageHome() {
    const up = open(), live = settled(), rec = agg(live), next = up[0];
    const now = Date.now(), recent = live.filter(p => now - new Date(p.ko) < 3 * 864e5).reverse();
    let board = "";
    for (const [, list] of byDay(up)) {
      board += `<div class="day" data-day><h3>${dayLong(list[0].ko)} <small>${list.length} pick${list.length === 1 ? "" : "s"} · ${new Set(list.map(p => p.lg)).size} league${new Set(list.map(p => p.lg)).size === 1 ? "" : "s"}</small></h3><div class="lgcols">`;
      board += ORDER().filter(c => list.some(p => p.lg === c)).map(c => `<div class="lgb" data-lg="${c}"><div class="lgh"><span class="cc">${LG[c][1]}</span>${esc(LG[c][0])}</div>${list.filter(p => p.lg === c).map(p => card(p)).join("")}</div>`).join("");
      board += `</div></div>`;
    }
    if (!up.length) board += `<div class="day"><div class="empty"><div class="ico">${ic("calendar")}</div><div><b>${D.public ? "No open picks right now" : "Live picks start soon"}</b><p>${D.public ? "Picks appear one to two days before kick-off. The next ones come with the next round of matches." : "The model already prices every match of the 18 leagues. Once live, every pick appears here one to two days before kick-off, and every result stays on the record."}</p></div></div></div>`;
    const waits = D.leagues.filter(l => l.state === "waiting"), nop = D.leagues.filter(l => l.state === "no_pick");
    if (waits.length) board += `<div class="day"><h3>Not at matchday 10 yet <small>${waits.length} league${waits.length === 1 ? "" : "s"}</small></h3><div class="grid2">${waits.slice(0, 4).map(emptyLeague).join("")}</div></div>`;
    if (nop.length) board += `<div class="day"><h3>No pick this round <small>${nop.length} league${nop.length === 1 ? "" : "s"}</small></h3><div class="grid2">${nop.slice(0, 2).map(emptyRound).join("")}</div></div>`;
    const lgs = ORDER().filter(c => up.some(p => p.lg === c));
    return `<section class="hA"><div class="wrap"><div class="g">
      <div><span class="kicker">Season 2026/27 · live record</span>
        <h1>One model. Every pick published a day before kick-off. Every result kept.</h1>
        <p class="sub">A statistical model trained on 14 seasons of matches and market prices picks Asian handicap sides in 18 leagues. No one chooses by hand, nothing is deleted.</p>
        <div class="rec">${kpis(rec)}<div class="chart"><div class="ttl">Units, pick by pick</div>${liveChart(live)}</div></div></div>
      <div><div class="nextk">${next ? "Next kick-off" : "Next picks"}</div>${next ? card(next, { big: true }) : `<div class="empty"><div class="ico">${ic("hourglass")}</div><div><b>${D.public ? "The next picks come with the next round" : "The first live picks come soon"}</b><p>Every pick is published 24 to 48 hours before kick-off, with the price at that moment, and is final from then on.</p></div></div>`}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><a class="btn primary" href="/record.html">${ic("chart-line")} Full record</a><a class="btn ghost" href="/method.html">How it works</a><a class="btn ghost" href="/simulation.html">Seven seasons, replayed</a></div></div>
    </div></div></section>
    <section class="section" style="padding-top:30px"><div class="wrap">
      <div class="head-row"><div><span class="kicker">The board</span><h2>Open picks</h2><p class="lead">${up.length ? `${up.length} open pick${up.length === 1 ? "" : "s"} in ${lgs.length} league${lgs.length === 1 ? "" : "s"}. ` : ""}Times are Madrid time. Each pick is final from the moment it appears.</p></div></div>
      ${lgs.length > 1 ? `<div class="filters" id="filters"><span class="chip on" data-f="">All leagues</span>${lgs.map(c => `<span class="chip" data-f="${c}">${esc(LG[c][0])}</span>`).join("")}</div>` : ""}
      ${board}
      ${recent.length ? `<div class="day"><h3>Just settled <small>last 3 days</small></h3><div class="grid3">${recent.slice(0, 9).map(p => card(p)).join("")}</div></div>` : ""}
      <div class="day"><h3>All 18 leagues</h3>${leagueStatus()}</div>
    </div></section>`;
  }
  function wireFilters() {
    const f = $("#filters"); if (!f) return;
    f.addEventListener("click", e => {
      const c = e.target.closest("[data-f]"); if (!c) return;
      f.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === c));
      const v = c.dataset.f;
      document.querySelectorAll(".lgb[data-lg]").forEach(b => b.style.display = !v || b.dataset.lg === v ? "" : "none");
      document.querySelectorAll("[data-day]").forEach(d => d.style.display = [...d.querySelectorAll(".lgb")].some(b => b.style.display !== "none") ? "" : "none");
    });
  }

  function simTab() {
    const fs = Object.values(S.full_seasons), perS = S.full[4] / fs.length, negS = fs.filter(x => x[4] < 0).length;
    return `<div class="banner sim"><span class="ico">${ic("alert-triangle")}</span><div><b>Historical simulation, not a record</b>What the same rules would have picked in past seasons, replayed match by match with only the data known before each match, at the sharp price one to two days before kick-off, like the live picks. Nobody followed these picks at the time.</div></div>
    <div class="kpis"><div class="kpi"><div class="l">Simulated picks</div><div class="v">${S.full[0].toLocaleString("en")}</div><div class="s">21 leagues, 2019/20–2024/25 · about ${Math.round(S.full[0] / S.weeks.length)} a week</div></div>
      <div class="kpi"><div class="l">Yield</div><div class="v">${sgn(S.full[1])}%</div><div class="s">1 unit per pick</div></div>
      <div class="kpi"><div class="l">Units a season</div><div class="v">${sgn(perS, 0)}</div><div class="s">${fs.length - negS} of ${fs.length} seasons above zero</div></div>
      <div class="kpi"><div class="l">The 18 live leagues</div><div class="v">${sgn(S.clean18[1])}%</div><div class="s">clean data only · ${S.clean18[0].toLocaleString("en")} picks</div></div></div>
    <div class="chart" style="margin-top:14px"><div class="ttl">Simulated units by week <span class="chip sim">SIMULATION</span><span class="mut" style="font-weight:500">21 leagues, 2019/20–2024/25, ${S.full[0].toLocaleString("en")} picks, ${sgn(S.full[1])}%</span></div>${simChart()}</div>
    <div class="notes3" style="margin-top:14px"><div><b>One league or one season says little.</b> With 300 to 900 picks, a single league's result can be 10 points off either way by chance.</div>
      <div><b>Full table by league and season:</b> <a class="ul" href="/simulation.html">Seven seasons, replayed</a>.</div></div>`;
  }
  function pageRecord() {
    const live = settled(), rec = agg(live);
    const tab = location.hash === "#simulation" ? "sim" : "live";
    const tbl = (head, rows) => `<div class="tblwrap scroll-x"><table class="tbl"><thead><tr>${head.map((h, i) => `<th class="${i ? "num" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
    const row = (name, a) => `<tr><td class="mt">${name}</td><td class="num">${a.n}</td><td class="num">${a.w}–${a.l}–${a.p}</td><td class="num ${cls(a.u)}"><b>${sgn(a.u)}</b></td><td class="num ${cls(a.y)}">${sgn(a.y * 100)}%</td></tr>`;
    const H = ["Picks", "W–L–P", "Units", "Yield"];
    let liveHtml;
    if (!live.length) liveHtml = `<div class="empty" style="margin-top:14px"><div class="ico">${ic("hourglass")}</div><div><b>The live record starts with the first settled pick</b><p>${D.record.open ? `${D.record.open} pick${D.record.open === 1 ? " is" : "s are"} open now. ` : ""}Every live pick is published 24 to 48 hours before kick-off and settled after the final whistle. Until then this page shows the simulation.</p></div></div><div class="chart" style="margin-top:14px">${liveChart([])}</div>`;
    else {
      const wkOf = p => monday(p.ko);
      const weeks = [...new Set(live.map(wkOf))].sort().reverse().map(w => row(`<a class="ul" href="/weekly.html?w=${w}">${weekLabel(w)}</a>`, agg(live.filter(p => wkOf(p) === w)))).join("");
      const mk = p => dayKey(p.ko).slice(0, 7);
      const months = [...new Set(live.map(mk))].sort().reverse().map(m => row(fmt(m + "-15T12:00:00Z", { month: "long", year: "numeric" }), agg(live.filter(p => mk(p) === m)))).join("");
      const lgs = ORDER().map(c => [c, agg(live.filter(p => p.lg === c))]).filter(x => x[1].n).map(([c, a]) => row(esc(LG[c][0]), a)).join("");
      liveHtml = `<div class="banner live"><span class="ico">${ic("check")}</span><div><b>Live record: real picks, published before kick-off</b>Every pick since ${dayLong(D.live_since)} 2026, settled at the reference price shown at publication. Nothing removed, nothing edited.</div></div>
      ${kpis(rec)}
      <div class="pg2" style="margin-top:14px"><div class="chart"><div class="ttl">Units, pick by pick</div>${liveChart(live)}</div>
      <div class="mini"><h4>Closing price, for information</h4><p>Average CLV so far: <b style="color:var(--text)">${rec.clv == null ? "—" : sgn(rec.clv) + "%"}</b>. CLV compares the price at publication with the closing price. It is shown for information only: in the simulation it sat slightly below zero (about −0.9%) in every season while the picks still made a profit, so this model is judged by results over many picks, not by CLV.</p></div></div>
      <h3 class="h3s">By week <small>Monday to Sunday</small></h3>${tbl(["Week", ...H], weeks)}
      <div class="cols2"><div><h3 class="h3s">By month</h3>${tbl(["Month", ...H], months)}</div><div><h3 class="h3s">By league <small>small samples are noise</small></h3>${tbl(["League", ...H], lgs)}</div></div>
      <p class="mut" style="margin-top:12px;font-size:13.5px">Every settled pick as a file: <a class="ul" href="/data/picks.csv" download>${ic("download")} picks.csv</a> · every change to this site is public in its history.</p>`;
    }
    return `<div class="wrap"><div class="ph"><span class="kicker">Record</span><h1>Every pick, and how it went</h1>
      <div class="tabs" id="rtabs"><button data-rt="live" class="${tab === "live" ? "on" : ""}">${ic("check")} Live record</button><button data-rt="sim" class="simt ${tab === "sim" ? "on" : ""}">${ic("chart-line")} Historical simulation</button></div></div>
      <div id="rbody">${tab === "live" ? liveHtml : simTab()}</div></div>`;
  }

  function howSettles(t, line) {
    const part = (m, l) => { const x = m + l; return x > 0 ? 1 : x < 0 ? -1 : 0; };
    const lab = m => { const q = Math.round(line * 4) % 2 !== 0, h = q ? [part(m, line - 0.25), part(m, line + 0.25)] : [part(m, line), part(m, line)];
      const w = h.filter(x => x > 0).length, l = h.filter(x => x < 0).length;
      return w === 2 ? "pick wins" : l === 2 ? "pick loses" : w && !l ? "half of the stake wins, half comes back" : l && !w ? "half of the stake loses, half comes back" : "stake comes back (push)"; };
    const merged = []; for (const m of [3, 2, 1, 0, -1, -2, -3]) { const L = lab(m), p = merged[merged.length - 1]; if (p && p[1] === L) p[0].push(m); else merged.push([[m], L]); }
    const one = m => m === 0 ? "draw" : m === 3 ? "win by 3 or more" : m === -3 ? "lose by 3 or more" : m > 0 ? `win by ${m}` : `lose by ${-m}`;
    const name = ms => { const hi = Math.max(...ms), lo = Math.min(...ms);
      if (ms.length === 1) return one(ms[0]);
      if (hi === 3 && lo >= 1) return lo === 1 ? "win" : `win by ${lo} or more`;
      if (lo === -3 && hi <= -1) return hi === -1 ? "lose" : `lose by ${-hi} or more`;
      if (lo === -3 && hi === 0) return "draw or lose";
      if (hi === 3 && lo === 0) return "win or draw";
      if (hi === 3 && lo < 0) return `win, draw or lose by ${-lo}`;
      if (lo === -3 && hi > 0) return `lose, draw or win by ${hi}`;
      return ms.map(one).join(" or "); };
    return merged.map(([ms, L]) => `<li><b>${esc(t)} ${name(ms)}</b>${L}</li>`).join("");
  }
  function pagePick() {
    const n = +new URLSearchParams(location.search).get("n"), p = D.picks.find(x => x.n === n);
    if (!p) return `<div class="wrap"><div class="ph"><span class="kicker">Pick</span><h1>Pick not found</h1><p class="lead">This pick number does not exist (yet). <a class="ul" href="/">Back to the board</a>.</p></div></div>`;
    const done = p.state === "settled";
    const tl = `<ul class="tl">
      <li class="done"><b>Published · ${when(p.pub)} Madrid</b>${Math.round(p.hb)} hours before kick-off. Reference price ${p.price.toFixed(2)}. From here the pick cannot change.</li>
      <li class="${done || p.state === "playing" ? "done" : ""}"><b>Kick-off · ${when(p.ko)}</b>${done && p.close ? `Closing reference price ${p.close.toFixed(2)}${p.clv != null ? ` (CLV ${sgn(p.clv)}%, for information)` : ""}.` : "The closing price is recorded at kick-off, for information."}</li>
      <li class="${done || p.state === "void" ? "done" : ""}"><b>Result</b>${done ? `${esc(p.home)} ${score(p)} ${esc(p.away)}. ${p.label}: ${sgn(p.u, 2)} units.` : p.state === "void" ? "Match not played: the pick is void and does not count." : "Settled automatically after the final whistle."}</li></ul>`;
    const whys = (p.why_more && p.why_more.length ? p.why_more : p.why ? [p.why] : []);
    const url = location.origin + "/pick.html?n=" + p.n;
    const xt = encodeURIComponent(`Pick #${p.n}: ${p.team} ${fmtLine(p.line)} vs ${p.opp}, ${dayShort(p.ko)}. Published ${Math.round(p.hb)} h before kick-off.`);
    document.title = `Pick #${p.n}: ${p.team} ${fmtLine(p.line)} | AI Boot Room`;
    return `<div class="wrap"><div class="ph"><span class="kicker">Pick #${p.n} · ${esc(LG[p.lg][0])}</span><h1>${esc(p.team)} ${fmtLine(p.line)} <span class="mut" style="font-size:.55em">vs ${esc(p.opp)}</span></h1></div>
      <div class="pg2"><div>${card(p, { big: true })}
        <div class="share" style="margin-top:12px"><button class="btn ghost sm" id="copy" data-url="${url}">${ic("copy")} Copy link</button><a class="btn ghost sm" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${xt}&url=${encodeURIComponent(url)}">${ic("brand-x")} Share on X</a><a class="btn ghost sm" href="/record.html">${ic("chart-line")} Full record</a></div></div>
      <div><h3 class="h3s" style="margin-top:0">Timeline</h3>${tl}
        <h3 class="h3s">How this pick is settled</h3><ul class="tl plain">${howSettles(p.team, p.line)}</ul>
        ${whys.length ? `<div class="mini" style="margin-top:10px"><h4>Inputs that counted for ${esc(p.team)}</h4>${whys.map(w => `<p style="margin-top:4px">${esc(w)}</p>`).join("")}<p class="mut" style="margin-top:8px;font-size:12.5px">From the model's strongest inputs for this match. The model weighs many more, together with the market prices.</p></div>` : ""}
        <p class="mut" style="font-size:12.5px;margin-top:12px">Record entry #${p.n} · published ${p.pub.replace("T", " ").slice(0, 16)} UTC · every change to this site is public in its history.</p></div></div></div>`;
  }

  function pageSimulation() {
    const SE = S.seasons, SL = s => `${s.slice(0, 2)}/${s.slice(2)}`;
    const G = { core: ["Core 10 leagues", "built and tested here"], added: ["8 added leagues", "the model never saw them while it was built"], scotland_lower: ["Scottish lower leagues", "not published: too little data"] };
    const bg = (y, n) => { if (n == null) return ""; const a = Math.min(1, Math.abs(y) / 20) * 0.5 * Math.min(1, n / 60) + 0.05; return `background:${y >= 0 ? `rgba(47,214,123,${a.toFixed(2)})` : `rgba(255,90,95,${a.toFixed(2)})`}`; };
    const cell = (x, k) => x ? `<td class="${k}" style="${bg(x[1], x[0])}">${sgn(x[1])}<span class="n">${x[0]}</span></td>` : `<td class="mut">–</td>`;
    let body = "";
    for (const g of ["core", "added", "scotland_lower"]) {
      body += `<tr class="grp"><td colspan="${SE.length + 3}">${G[g][0]} <span class="mut" style="text-transform:none;letter-spacing:0;font-weight:600">· ${G[g][1]}</span></td></tr>`;
      for (const L of S.leagues.filter(l => l.g === g))
        body += `<tr class="${g === "scotland_lower" ? "off" : ""}"><td class="l">${esc(L.name)}</td>${SE.map(s => cell(L.s[s], g === "core" ? (s >= "2425" ? "ho" : "") : "nw")).join("")}<td class="tot" style="${bg(L.all[1], L.all[0])}">${sgn(L.all[1])}<span class="n">${L.all[0]}</span></td><td class="mut" style="font-size:11.5px">${sgn(L.all[2])} to ${sgn(L.all[3])}</td></tr>`;
      const GG = S.groups[g];
      body += `<tr class="sum"><td class="l">Total · ${G[g][0]}</td>${SE.map(s => GG.s[s] ? `<td>${sgn(GG.s[s][1])}<span class="n">${GG.s[s][0]}</span></td>` : "<td>–</td>").join("")}<td>${sgn(GG.all[1])}<span class="n">${GG.all[0]}</span></td><td class="mut" style="font-size:11.5px">${sgn(GG.all[2])} to ${sgn(GG.all[3])}</td></tr>`;
    }
    body += `<tr class="sum"><td class="l" style="color:var(--accent)">All 21 leagues</td>${SE.map(s => `<td>${sgn(S.all.s[s][1])}<span class="n">${S.all.s[s][0]}</span></td>`).join("")}<td style="color:var(--accent)">${sgn(S.all.all[1])}<span class="n">${S.all.all[0]}</span></td><td class="mut" style="font-size:11.5px">${sgn(S.all.all[2])} to ${sgn(S.all.all[3])}</td></tr>`;
    return `<div class="wrap"><div class="ph"><span class="kicker">Simulation</span><h1>Seven seasons, replayed</h1>
      <p class="lead">Yield of every pick the rules would have made, by league and season, at the sharp price one to two days before kick-off (the same kind of price as the live picks), 1 unit per pick. Small number = picks. <span class="chip sim">SIMULATION</span></p></div>
      <div class="banner sim"><span class="ico">${ic("alert-triangle")}</span><div><b>This is a simulation, not a betting record</b>Each season was picked by a model trained only on earlier seasons, using only what was known before each match. It still has limits: the core leagues were also used to build the model, and 2025/26 covers only part of the season.</div></div>
      <h3 class="h3s">Three kinds of data</h3>
      <div class="periods">
        <div class="per"><b><span class="sw" style="border:2px solid #31405a"></span>Development · 2019/20–2023/24</b>The core 10 leagues while the model was built and compared with other versions. The most optimistic part of the table.</div>
        <div class="per"><b><span class="sw" style="border:2px solid var(--blue)"></span>Holdout · 2024/25–2025/26</b>Kept locked until the model was frozen, then run once. Core 10 leagues. 2025/26 covers only part of the season.</div>
        <div class="per"><b><span class="sw" style="border:2px dashed #6a7fa0"></span>New leagues · 2019/20–2025/26</b>Eight leagues the model never saw while it was built, run once with the frozen model.</div></div>
      <div class="scroll-x" style="margin-top:18px"><table class="bt"><thead><tr><th class="l">League</th>${SE.map(s => `<th>${SL(s)}</th>`).join("")}<th>All</th><th>95% range</th></tr></thead><tbody>${body}</tbody></table></div>
      <div class="kpis" style="margin-top:18px"><div class="kpi"><div class="l">All 21 leagues</div><div class="v">${sgn(S.all.all[1])}%</div><div class="s">${S.all.all[0].toLocaleString("en")} picks · ${sgn(S.all.all[2])} to ${sgn(S.all.all[3])}%</div></div>
        <div class="kpi"><div class="l">Clean data only</div><div class="v">${sgn(S.clean[1])}%</div><div class="s">holdout + new leagues · ${S.clean[0].toLocaleString("en")} picks</div></div>
        <div class="kpi"><div class="l">The 18 live leagues, clean</div><div class="v">${sgn(S.clean18[1])}%</div><div class="s">${S.clean18[0].toLocaleString("en")} picks · ${sgn(S.clean18[2])} to ${sgn(S.clean18[3])}%</div></div>
        <div class="kpi"><div class="l">2014/15–2018/19</div><div class="v">+0.8%</div><div class="s">older seasons, early price, less training data</div></div></div>
      <div class="notes3" style="margin-top:14px"><div><b>Read the bottom line, not the cells.</b> One league in one season is 30 to 150 picks: the result can be 20 points off either way by chance. Picking the "best leagues" from this table would be choosing noise.</div>
        <div><b>Older seasons were weaker.</b> In 2014/15–2018/19 the model had only 2 to 6 seasons to learn from and was priced at the best early price; the result was close to zero. The edge grew with more training seasons.</div>
        <div><b>Live is a separate record.</b> Live picks use the same kind of price, but markets get sharper every year and the development seasons flatter the model. The <a class="ul" href="/record.html">live record</a> shows it either way.</div></div></div>`;
  }

  function pageMethod() {
    const rules = [
      ["clock", "24 to 48 hours before kick-off", "Every pick appears one to two days before the match, with the price at that moment. Nothing is added later, when team news is out."],
      ["calendar", "From matchday 10", "The model needs this season's numbers. In each league picks start when every team has played 9 league matches. From August to October the board is mostly empty."],
      ["world", "18 leagues, fixed in advance", "England (4 divisions), Spain, Italy, Germany and France (2 each), Netherlands, Portugal, Turkey, Belgium, Scotland, Greece. The list does not change during the season."],
      ["coins", "One reference price for every pick", "The price is the sharp market reference price at the moment of publication, never the best number found anywhere. Results use that price, 1 unit per pick."],
      ["target", "Zero picking by hand", "Every match that meets the rule is published. No one removes a pick, adds one, or skips a weekend."],
      ["lock", "Final and kept", "A published pick is never edited or deleted. Every change to the site is in its public history."],
      ["chart-bar", "Every result on the page", "The model runs the whole season with the same rules. Losing weeks are published the same way as winning ones."],
      ["chart-line", "Live and simulation, never mixed", "Live picks are a record of their own. Past seasons are shown only as a simulation, on separate pages."]];
    return `<div class="wrap"><div class="ph"><span class="kicker">How it works</span><h1>A statistical model, simple rules, all results in public</h1>
      <p class="lead">The model is trained on 14 seasons of matches and market prices. It does one thing: it estimates the chance that a team covers the main Asian handicap line, and compares it with the market.</p></div>
      <div class="steps" style="margin-top:18px">
        <div class="step"><div class="n">1</div><b>Reads the season</b><p>For both teams: results, goals, chances created and allowed, form against the line, rest, cup matches and missing players.</p></div>
        <div class="step"><div class="n">2</div><b>Reads the market</b><p>The prices for the match, turned into chances without the margin.</p></div>
        <div class="step"><div class="n">3</div><b>Compares</b><p>When the model's chance to cover is clearly higher than the market's, the side becomes a pick. Most matches are not picks.</p></div>
        <div class="step"><div class="n">4</div><b>Publishes and settles</b><p>The pick goes out automatically with its reference price. After the match it is settled at that price.</p></div></div>
      <h3 class="h3s">The rules</h3><div class="rules">${rules.map(([i, t, d]) => `<div class="rule"><span class="ico">${ic(i)}</span><div><b>${t}</b>${d}</div></div>`).join("")}</div>
      <h3 class="h3s">Asian handicap in one minute</h3>
      <div class="prose"><p>A handicap gives one team a start. <b>Fulham +0.25</b> means Fulham start with a quarter of a goal: if Fulham win, the pick wins; if the match is a draw, half the stake wins and half comes back; if Fulham lose, the pick loses. <b>Mainz −0.25</b> is the other way round: a draw loses half.</p>
        <p>The main line is the one where the market sees both sides close to 50/50. That is why a good model wins only a little more often than it loses, and why the record needs hundreds of picks before it means anything.</p></div>
      <h3 class="h3s">What to expect</h3>
      <div class="notes3"><div><b>A small edge, if any.</b> The <a class="ul" href="/simulation.html">simulation</a> found about +${Math.round(S.full[1])} units per 100 picks at the sharp price a day or two before kick-off. Live it will probably be less.</div>
        <div><b>About 40 picks a week</b> once every league has reached matchday 10, fewer in the first weeks of the season.</div>
        <div><b>Not a promise.</b> Past results, live or simulated, do not tell you what will happen next.</div></div>
      <h3 class="h3s">Who is behind this</h3><div class="prose"><p>AI Boot Room is an independent project run from Spain. It does not take bets, has no betting partners, sells nothing and is not paid for picks.</p></div>
      <div class="legalbox" style="margin-top:18px"><div class="r18">18+</div><div><b style="color:var(--text);display:block;margin-bottom:4px">For adults. Information only.</b>Nothing on this site is advice to bet. If you choose to gamble, only use money you can afford to lose, and stop if it stops being fun. Help in Spain: jugarbien.es.</div></div></div>`;
  }

  function monday(iso) { const k = dayKey(iso), d = new Date(k + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
  function weekLabel(w) { const a = new Date(w + "T12:00:00Z"), b = new Date(a); b.setUTCDate(a.getUTCDate() + 6);
    const f = (d, o) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(d);
    return a.getUTCMonth() === b.getUTCMonth() ? `${f(a, { day: "numeric" })}–${f(b, { day: "numeric", month: "long" })}` : `${f(a, { day: "numeric", month: "short" })} – ${f(b, { day: "numeric", month: "short" })}`; }
  function pageWeekly() {
    const live = settled(), weeks = [...new Set(live.map(p => monday(p.ko)))].sort();
    if (!weeks.length) return `<div class="wrap"><div class="ph"><span class="kicker">Weekly report</span><h1>The first report comes on the Monday after the first picks</h1></div><div class="empty"><div class="ico">${ic("calendar")}</div><div><b>No settled picks yet</b><p>Every Monday: all picks of the week, the results and the season so far. Nothing is added or removed after the fact.</p></div></div></div>`;
    let w = new URLSearchParams(location.search).get("w"); if (!weeks.includes(w)) w = weeks[weeks.length - 1];
    const i = weeks.indexOf(w), L = live.filter(p => monday(p.ko) === w), a = agg(L), s = agg(live.filter(p => monday(p.ko) <= w));
    const lgs = ORDER().map(c => [c, agg(L.filter(p => p.lg === c))]).filter(x => x[1].n).sort((x, y) => y[1].u - x[1].u);
    const rows = L.map(p => `<tr class="clk" onclick="location.href='/pick.html?n=${p.n}'"><td>${dayShort(p.ko)}</td><td class="mut">${esc(LG[p.lg][0])}</td><td class="mt">${esc(p.home)} <span class="mut">${score(p)}</span> ${esc(p.away)}</td><td class="pkv">${esc(p.team)} ${fmtLine(p.line)}</td><td class="num">${p.price.toFixed(2)}</td><td class="num mut">${p.close ? p.close.toFixed(2) : "—"}</td><td><span class="chip ${p.k === "won" ? "g" : p.k === "lost" ? "r" : ""}">${p.label}</span></td><td class="num ${cls(p.u)}"><b>${sgn(p.u, 2)}</b></td></tr>`).join("");
    const yr = new Date(w + "T12:00:00Z").getUTCFullYear();
    return `<div class="wrap"><div class="ph"><span class="kicker">Weekly report</span><h1>${weekLabel(w)} ${yr}</h1>
      <div class="wnav">${i > 0 ? `<a class="btn ghost sm" href="?w=${weeks[i - 1]}">← ${weekLabel(weeks[i - 1])}</a>` : ""}<span class="chip">Monday to Sunday, Madrid time</span>${i < weeks.length - 1 ? `<a class="btn ghost sm" href="?w=${weeks[i + 1]}">${weekLabel(weeks[i + 1])} →</a>` : ""}</div></div>
      <div class="kpis" style="margin-top:14px"><div class="kpi"><div class="l">This week</div><div class="v">${a.n} picks</div><div class="s">${a.w} won · ${a.l} lost · ${a.p} push</div></div>
        <div class="kpi"><div class="l">Units</div><div class="v ${cls(a.u)}">${sgn(a.u)}</div><div class="s">yield ${sgn(a.y * 100)}%</div></div>
        <div class="kpi"><div class="l">Won</div><div class="v">${Math.round(a.w / Math.max(a.w + a.l, 1) * 100)}%</div><div class="s">of picks with a winner</div></div>
        <div class="kpi"><div class="l">Season so far</div><div class="v ${cls(s.u)}">${sgn(s.u)}</div><div class="s">${s.n} picks · yield ${sgn(s.y * 100)}%</div></div></div>
      ${lgs.length > 1 ? `<div class="notes3" style="margin-top:14px"><div><b>Best and worst league this week:</b> ${esc(LG[lgs[0][0]][0])} ${sgn(lgs[0][1].u)} u from ${lgs[0][1].n} pick${lgs[0][1].n === 1 ? "" : "s"}; ${esc(LG[lgs[lgs.length - 1][0]][0])} ${sgn(lgs[lgs.length - 1][1].u)} u from ${lgs[lgs.length - 1][1].n}. Over one week this is noise.</div>${a.clv != null ? `<div><b>For information:</b> average CLV this week ${sgn(a.clv)}%. In the simulation it sat just below zero in every season, so it does not judge the model.</div>` : ""}</div>` : ""}
      <h3 class="h3s">Every pick of the week <small>${a.n} picks, nothing left out</small></h3>
      <div class="tblwrap scroll-x"><table class="tbl" style="min-width:820px"><thead><tr><th>Day</th><th>League</th><th>Match</th><th>Pick</th><th class="num">Price</th><th class="num">Close</th><th>Result</th><th class="num">Units</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="mut" style="font-size:13px;margin-top:10px">Price = reference price at publication; close = closing price, for information. Void matches are not counted.</p></div>`;
  }

  const footer = `<footer><div class="wrap"><span class="rg"><b>18+</b><span>Information only, not betting advice. AI Boot Room does not take bets, has no betting partners and is paid by no one for picks. Results are past results. If gambling stops being fun, get help: jugarbien.es.</span></span><span class="sp"></span><a href="/method.html">Rules</a><a href="/archive.html">Old picks (previous system)</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></div></footer>`;
  const PAGES = { home: pageHome, record: pageRecord, pick: pagePick, simulation: pageSimulation, method: pageMethod, weekly: pageWeekly };

  function render() {
    const page = document.body.dataset.page;
    $("#app").innerHTML = PAGES[page]() + footer;
    if (page === "home") wireFilters();
    const r = $("#rtabs");
    if (r) r.addEventListener("click", e => { const b = e.target.closest("[data-rt]"); if (!b) return; history.replaceState(null, "", b.dataset.rt === "sim" ? "#simulation" : location.pathname); render(); });
    const c = $("#copy");
    if (c) c.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(c.dataset.url).then(() => { c.innerHTML = `${ic("check")} Copied`; }); });
  }
  addEventListener("hashchange", () => { if (D && document.body.dataset.page === "record") render(); });
  const bust = Math.floor(Date.now() / 120000);
  Promise.all([fetch(`/data/model.json?t=${bust}`).then(r => r.json()), fetch(`/data/simulation.json?t=${bust}`).then(r => r.json())])
    .then(([m, s]) => { D = m; S = s; D.leagues.forEach(l => LG[l.c] = [l.name, l.cc]); render(); })
    .catch(e => { $("#app").innerHTML = `<div class="wrap loading">The page could not load its data. Please try again in a minute.</div>`; console.error(e); });
})();

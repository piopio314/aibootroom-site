/* Cookie consent (Spain: LSSI art. 22.2 + AEPD cookie guide). Google Analytics loads ONLY after "Accept";
   "Reject" is just as easy. The choice is kept in localStorage (strictly necessary, no consent needed for it).
   Footer link "Cookie settings" → ABRConsent.open() lets the visitor change the choice at any time. */
(function () {
  var GA = 'G-PLCSSXHLT9', KEY = 'abr_consent';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function loadGA() {
    if (window.__abrGA) return;
    window.__abrGA = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA);
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA;
    document.head.appendChild(s);
  }
  function clearGA() {          // "Reject" after an earlier "Accept": remove the Analytics cookies we can reach
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (/^_ga/.test(n)) ['', '.aibootroom.com', 'www.aibootroom.com'].forEach(function (d) {
        document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }
  function banner() {
    if (document.getElementById('abr-consent')) return;
    var b = document.createElement('div');
    b.id = 'abr-consent';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookie choice');
    b.innerHTML = '<p><b>Cookies.</b> We would like to use Google Analytics cookies to count visits and see which pages ' +
      'people read. Nothing else is tracked and the site works the same either way. ' +
      '<a href="/privacy.html#cookies">Details</a></p>' +
      '<div><button type="button" data-v="denied">Reject</button><button type="button" data-v="granted">Accept</button></div>';
    b.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute('data-v');
      if (!v) return;
      set(v);
      if (v === 'granted') loadGA(); else { clearGA(); if (window.__abrGA) location.reload(); }
      b.remove();
    });
    document.body.appendChild(b);
  }
  window.ABRConsent = { open: banner, state: get };
  if (get() === 'granted') loadGA();
  else if (get() !== 'denied') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner); else banner();
  }
})();

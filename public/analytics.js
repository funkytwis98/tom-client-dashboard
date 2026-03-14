// Tom Agency Analytics Snippet — <2KB minified
// Usage: <script src="https://ai-receptionist-snowy.vercel.app/analytics.js" data-client="CLIENT_ID"></script>
(function() {
  'use strict';
  var s = document.currentScript;
  if (!s) return;
  var cid = s.getAttribute('data-client');
  if (!cid) return;
  var endpoint = s.src.replace(/\/analytics\.js.*$/, '/api/analytics/track');
  var vid = '';
  try {
    vid = localStorage.getItem('_tom_vid') || '';
    if (!vid) {
      vid = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('_tom_vid', vid);
    }
  } catch(e) {
    vid = Math.random().toString(36).substring(2);
  }

  function send(type, label, meta) {
    var data = {
      client_id: cid,
      event_type: type,
      page_url: location.href,
      referrer: document.referrer || null,
      event_label: label || null,
      metadata: meta || null,
      visitor_id: vid
    };
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      var x = new XMLHttpRequest();
      x.open('POST', endpoint, true);
      x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify(data));
    }
  }

  // Track page view
  send('page_view');

  // Track clicks on elements with data-track="true"
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-track') === 'true') {
        var label = el.getAttribute('data-track-label') || el.textContent.trim().substring(0, 100);
        send('button_click', label);
        return;
      }
      el = el.parentElement;
    }
  }, true);

  // Track form submissions with data-track-form="true"
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.getAttribute && form.getAttribute('data-track-form') === 'true') {
      var label = form.getAttribute('data-track-label') || form.getAttribute('name') || 'form';
      send('form_submit', label);
    }
  }, true);
})();

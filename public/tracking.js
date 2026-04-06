// Tom Integrations Website Tracking Script — <2KB
// Usage: <script src="https://ai-receptionist-snowy.vercel.app/tracking.js" data-client-id="CLIENT_ID" async></script>
(function() {
  var s = document.currentScript;
  if (!s) return;
  var cid = s.getAttribute('data-client-id');
  if (!cid) return;
  var endpoint = s.src.replace('/tracking.js', '/api/webhooks/website-analytics');
  var vid;
  try {
    vid = localStorage.getItem('_tom_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('_tom_vid', vid);
    }
  } catch(e) {
    vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
  var data = {
    client_id: cid,
    event_type: 'page_view',
    page_url: window.location.pathname,
    referrer: document.referrer || '',
    visitor_id: vid,
    metadata: {
      user_agent: navigator.userAgent,
      screen_width: screen.width
    }
  };
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true
  }).catch(function() {});
})();

// Anonymous page-view counting via Vercel Web Analytics (cookie-less, same-origin /_vercel/insights).
// Only screen names are sent ('/', '/setup', '/play') — never settings, card ids, votes or psych-test answers.
// Disabled on localhost, GitHub Pages and any host not listed below.

const HOSTS = [/\.vercel\.app$/];

export const isAnalyticsHost = (hostname) => HOSTS.some((re) => re.test(hostname));

const enabled = typeof location !== 'undefined' && isAnalyticsHost(location.hostname);

export function initAnalytics() {
  if (!enabled) return;
  window.va = window.va || function va() { (window.vaq = window.vaq || []).push(arguments); };
  const script = document.createElement('script');
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  script.dataset.disableAutoTrack = '1';
  document.head.append(script);
}

export function trackScreen(screen) {
  if (!enabled) return;
  const path = screen === 'home' ? '/' : `/${screen}`;
  window.va('pageview', { route: path, path });
}

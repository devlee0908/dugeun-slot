// Anonymous page-view counting via Vercel Web Analytics (cookie-less, same-origin /_vercel/insights).
// Only screen names are sent ('/', '/setup', '/play') — never settings, card ids, votes or psych-test answers.
// Disabled on localhost, any host not listed below, and automated browsers.

const HOSTS = [/\.vercel\.app$/];

export const isAnalyticsHost = (hostname) => HOSTS.some((re) => re.test(hostname));

// Automated browsers (our E2E/device tests, crawlers) report navigator.webdriver and are not counted.
const enabled = typeof location !== 'undefined' && isAnalyticsHost(location.hostname) && !navigator.webdriver;

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

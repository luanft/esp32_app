// Thin client for the ESP32 REST API.
//
// When the page is served by the ESP32 itself the base URL is '' (same origin).
// When the UI is opened from github.io (or `npm start`) the user can point it
// at the device with the "Device" setting, e.g. http://192.168.1.50
// Note: an https page cannot call an http device (mixed content), so for the
// hosted copy open it over http:// or use the page served by the ESP32.

const KEY = 'esp32.deviceUrl';

export function getBaseUrl() {
  try {
    return localStorage.getItem(KEY) || process.env.REACT_APP_DEVICE_URL || '';
  } catch {
    return process.env.REACT_APP_DEVICE_URL || '';
  }
}

export function setBaseUrl(url) {
  const clean = url.trim().replace(/\/+$/, '');
  try {
    if (clean) localStorage.setItem(KEY, clean);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  return clean;
}

async function request(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(getBaseUrl() + path, {
      ...options,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  info: () => request('/api/info'),
  tasks: () => request('/api/tasks'),
  led: () => request('/api/led'),
  setLed: (on) => request('/api/led', { method: 'POST', body: JSON.stringify({ on }) }),
  toggleLed: () => request('/api/led/toggle', { method: 'POST' }),
  restart: () => request('/api/restart', { method: 'POST' }),
};

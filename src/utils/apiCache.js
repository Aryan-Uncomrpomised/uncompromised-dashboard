/**
 * Fetches data directly from the backend API without browser caching.
 */
export function fetchWithCache(url, onData, onError) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      onData(data);
    })
    .catch(err => {
      if (onError) onError(err);
      else console.error(`Failed fetch for ${url}:`, err);
    });
}

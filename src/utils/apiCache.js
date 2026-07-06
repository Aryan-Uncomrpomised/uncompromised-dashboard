/**
 * Fetches data with a Stale-While-Revalidate (SWR) cache pattern.
 * If cached data exists, it is instantly returned to the UI.
 * If the cache is stale (older than ttlMinutes), a background fetch updates it.
 */
export function fetchWithCache(url, onData, onError, ttlMinutes = 5) {
  const cacheKey = `api_cache_${url}`;
  const cached = localStorage.getItem(cacheKey);
  let isFresh = false;

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Immediately render cached data
      onData(data);
      
      const age = (Date.now() - timestamp) / 1000 / 60;
      if (age < ttlMinutes) {
        isFresh = true;
      }
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  // If not fresh (or not cached at all), fetch in the background
  if (!isFresh) {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        onData(data);
      })
      .catch(err => {
        if (onError) onError(err);
        else console.error(`Failed background fetch for ${url}:`, err);
      });
  }
}

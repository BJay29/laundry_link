import { useEffect, useState } from 'react';

/**
 * useMediaQuery('(min-width: 1024px)') -> true/false, live.
 *
 * Ginagamit kapag kailangang MAG-RENDER ng ibang layout (hal. card list sa
 * phone, table sa desktop) at hindi sapat ang CSS lang (hidden/block) —
 * halimbawa kapag may refs/portal na hindi dapat nadodoble sa DOM.
 */
const useMediaQuery = (query) => {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : true;

  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;
import { useEffect, useState } from 'react';

export function useIsMobile(breakpointPx = 768) {
	const getMatches = () => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
		return window.matchMedia(`(max-width: ${breakpointPx}px)`).matches;
	};

	const [isMobile, setIsMobile] = useState(getMatches);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

		const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
		const onChange = (event) => setIsMobile(event.matches);

		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', onChange);
			return () => mediaQuery.removeEventListener('change', onChange);
		}

		mediaQuery.addListener(onChange);
		return () => mediaQuery.removeListener(onChange);
	}, [breakpointPx]);

	return isMobile;
}



import { useMemo, useState } from 'react';
import { useIsMobile } from './useIsMobile';

export function useResponsiveMode(breakpointPx = 768) {
	const autoIsMobile = useIsMobile(breakpointPx);
	const [forcedMode, setForcedMode] = useState(null); // 'mobile' | 'desktop' | null

	const isMobile = useMemo(() => {
		if (forcedMode === 'mobile') return true;
		if (forcedMode === 'desktop') return false;
		return autoIsMobile;
	}, [autoIsMobile, forcedMode]);

	return {
		isMobile,
		forcedMode,
		setForcedMode,
	};
}



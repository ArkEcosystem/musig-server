import mm from "micromatch";

export const isListed = (ip: string, patterns: string[]): boolean => {
	if (!Array.isArray(patterns)) {
		return true;
	}

	for (const pattern of patterns) {
		if (mm.isMatch(ip, pattern)) {
			return true;
		}
	}

	return false;
};

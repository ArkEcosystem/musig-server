export interface RateLimitResult {
	msBeforeNext: number;
	remainingPoints: number;
	consumedPoints: number;
	isFirstInDuration: boolean;
}

import { computed, pauseTracking, resumeTracking, signal } from '../src';

test('should pause tracking', () => {
	const src = signal(0);
	const c = computed(() => {
		pauseTracking();
		const value = src.get();
		resumeTracking();
		return value;
	});
	expect(c.get()).toBe(0);

	src.set(1);
	expect(c.get()).toBe(0);
});

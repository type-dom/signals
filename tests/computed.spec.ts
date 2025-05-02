import { test, expect, } from 'vitest';
import { computed, signal } from '../src';

test('should correctly propagate changes through computed signals', () => {
	const src = signal(0);
	const c1 = computed(() => src.get() % 2);
	const c2 = computed(() => c1.get());
	const c3 = computed(() => c2.get());

	c3.get();
	src.set(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
	c2.get(); // c1 -> none, c2 -> none
	src.set(3); // c1 -> dirty, c2 -> toCheckDirty

	expect(c3.get()).toBe(1);
});

test('should propagate updated source value through chained computations', () => {
	const src = signal(0);
	const a = computed(() => src.get());
	const b = computed(() => a.get() % 2);
	const c = computed(() => src.get());
	const d = computed(() => b.get() + c.get());

	expect(d.get()).toBe(0);
	src.set(2);
	expect(d.get()).toBe(2);
});

test('should handle flags are indirectly updated during checkDirty', () => {
	const a = signal(false);
	const b = computed(() => a.get());
	const c = computed(() => {
		b.get();
		return 0;
	});
	const d = computed(() => {
		c.get();
		return b.get();
	});

	expect(d.get()).toBe(false);
	a.set(true);
	expect(d.get()).toBe(true);
});

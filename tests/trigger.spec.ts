import { expect, test } from 'vitest';
import { computed, effect, trigger, signal } from '../src';

test('should not throw when triggering with no dependencies', () => {
	trigger(() => { });
});

test('should trigger updates for dependent computed signals', () => {
	const arr = signal<number[]>([]);
	const length = computed(() => arr.get().length);

	expect(length.get()).toBe(0);
	arr.get().push(1);
	trigger(arr);
	expect(length.get()).toBe(1);
});

test('should trigger updates for the second source signal', () => {
	const src1 = signal<number[]>([]);
	const src2 = signal<number[]>([]);
	const length = computed(() => src2.get().length);

	expect(length.get()).toBe(0);
	src2.get().push(1);
	trigger(() => {
		src1.get();
		src2.get();
	});
	expect(length.get()).toBe(1);
});

test('should trigger effect once', () => {
	const src1 = signal<number[]>([]);
	const src2 = signal<number[]>([]);

	let triggers = 0;

	effect(() => {
		triggers++;
		src1.get();
		src2.get();
	});

	expect(triggers).toBe(1);
	trigger(() => {
		src1.get();
		src2.get();
	});
	expect(triggers).toBe(2);
});

test('should not notify the trigger function sub', () => {
	const src1 = signal<number[]>([]);
	const src2 = computed(() => src1.get());

	effect(() => {
		src1.get();
		src2.get();
	});
	trigger(() => {
		src1.get();
		src2.get();
	});
});

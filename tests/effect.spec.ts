import { test, expect } from "vitest";
import { computed, effect, effectScope, endBatch, pauseTracking, resumeTracking, signal, startBatch } from '../src';

test('should clear subscriptions when untracked by all subscribers', () => {
	let bRunTimes = 0;

	const a = signal(1);
	const b = computed(() => {
		bRunTimes++;
		return a.get() * 2;
	});
	const stopEffect = effect(() => {
		b.get();
	});

	expect(bRunTimes).toBe(1);
	a.set(2);
	expect(bRunTimes).toBe(2);
	stopEffect();
	a.set(3);
	expect(bRunTimes).toBe(2);
});

test('should not run untracked inner effect', () => {
	const a = signal(3);
	const b = computed(() => a.get() > 0);

	effect(() => {
		if (b.get()) {
			effect(() => {
				if (a.get() == 0) {
					throw new Error('bad');
				}
			});
		}
	});

	decrement();
	decrement();
	decrement();

	function decrement() {
		a.set(a.get() - 1);
	}
});

test('should run outer effect first', () => {
	const a = signal(1);
	const b = signal(1);

	effect(() => {
		if (a.get()) {
			effect(() => {
				b.get();
				if (a.get() == 0) {
					throw new Error('bad');
				}
			});
		} else {
			/* nothing */
		}
	});

	startBatch();
	b.set(0);
	a.set(0);
	endBatch();
});

test('should not trigger inner effect when resolve maybe dirty', () => {
	const a = signal(0);
	const b = computed(() => a.get() % 2);

	let innerTriggerTimes = 0;

	effect(() => {
		effect(() => {
			b.get();
			innerTriggerTimes++;
			if (innerTriggerTimes >= 2) {
				throw new Error('bad');
			}
		});
	});

	a.set(2);
});

test('should trigger inner effects in sequence', () => {
	const a = signal(0);
	const b = signal(0);
	const c = computed(() => a.get() - b.get());
	const order: string[] = [];

	effect(() => {
		c.get();

		effect(() => {
			order.push('first inner');
			a.get();
		});

		effect(() => {
			order.push('last inner');
			a.get();
			b.get();
		});
	});

	order.length = 0;

	startBatch();
	b.set(1);
	a.set(1);
	endBatch();

	expect(order).toEqual(['first inner', 'last inner']);
});

test('should trigger inner effects in sequence in effect scope', () => {
	const a = signal(0);
	const b = signal(0);
	const order: string[] = [];

	effectScope(() => {

		effect(() => {
			order.push('first inner');
			a.get();
		});

		effect(() => {
			order.push('last inner');
			a.get();
			b.get();
		});
	});

	order.length = 0;

	startBatch();
	b.set(1);
	a.set(1);
	endBatch();

	expect(order).toEqual(['first inner', 'last inner']);
});

test('should custom effect support batch', () => {
	function batchEffect(fn: () => void) {
		return effect(() => {
			startBatch();
			try {
				return fn();
			} finally {
				endBatch();
			}
		});
	}

	const logs: string[] = [];
	const a = signal(0);
	const b = signal(0);

	const aa = computed(() => {
		logs.push('aa-0');
		if (a.get() === 0) {
			b.set(1);
		}
		logs.push('aa-1');
	});

	const bb = computed(() => {
		logs.push('bb');
		return b.get();
	});

	batchEffect(() => {
		bb.get();
	});
	batchEffect(() => {
		aa.get();
	});

	expect(logs).toEqual(['bb', 'aa-0', 'aa-1', 'bb']);
});

test('should duplicate subscribers do not affect the notify order', () => {
	const src1 = signal(0);
	const src2 = signal(0);
	const order: string[] = [];

	effect(() => {
		order.push('a');
		pauseTracking();
		const isOne = src2.get() === 1;
		resumeTracking();
		if (isOne) {
			src1.get();
		}
		src2.get();
		src1.get();
	});
	effect(() => {
		order.push('b');
		src1.get();
	});
	src2.set(1); // src1.subs: a -> b -> a

	order.length = 0;
	src1.set(src1.get() + 1);

	expect(order).toEqual(['a', 'b']);
});

test('should handle side effect with inner effects', () => {
	const a = signal(0);
	const b = signal(0);
	const order: string[] = [];

	effect(() => {
		effect(() => {
			a.get();
			order.push('a');
		});
		effect(() => {
			b.get();
			order.push('b');
		});
		expect(order).toEqual(['a', 'b']);

		order.length = 0;
		b.set(1);
		a.set(1);
		expect(order).toEqual(['b', 'a']);
	});
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

	let triggers = 0;

	effect(() => {
		d.get();
		triggers++;
	});
	expect(triggers).toBe(1);
	a.set(true);
	expect(triggers).toBe(2);
});

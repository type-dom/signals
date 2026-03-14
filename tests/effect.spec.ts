import { test, expect } from 'vitest';
import { computed, effect, effectScope, endBatch, getActiveSub, setActiveSub, signal, startBatch } from '../src';
import { ReactiveFlags } from '../src/system';

test('should clear subscriptions when untracked by all subscribers', () => {
	let bRunTimes = 0;

	const a = signal(1);
	const b = computed(() => {
		bRunTimes++;
		return a.get()! * 2;
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
	const b = computed(() => a.get()! > 0);

	effect(() => {
		if (b.get()) {
			effect(() => {
				if (a.get() == 0) {
					throw new Error('bad');
				}
			});
		}
	});

  a.set(2);
  a.set(1);
  a.set(0);
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
		} else { /* nothing */
		}
	});

	startBatch();
	b.set(0);
	a.set(0);
	endBatch();
});

test('should not trigger inner effect when resolve maybe dirty', () => {
	const a = signal(0);
	const b = computed(() => a.get()! % 2);

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

test('should notify inner effects in the same order as non-inner effects', () => {
	const a = signal(0);
	const b = signal(0);
	const c = computed(() => a.get() - b.get());
	const order1: string[] = [];
	const order2: string[] = [];
	const order3: string[] = [];

	effect(() => {
		order1.push('effect1');
		a.get();
	});
	effect(() => {
		order1.push('effect2');
		a.get();
		b.get();
	});

	effect(() => {
		c.get();
		effect(() => {
			order2.push('effect1');
			a.get();
		});
		effect(() => {
			order2.push('effect2');
			a.get();
			b.get();
		});
	});

	effectScope(() => {
		effect(() => {
			order3.push('effect1');
			a.get();
		});
		effect(() => {
			order3.push('effect2');
			a.get();
			b.get();
		});
	});

	order1.length = 0;
	order2.length = 0;
	order3.length = 0;

	startBatch();
	b.set(1);
	a.set(1);
	endBatch();

	expect(order1).toEqual(['effect2', 'effect1']);
	expect(order2).toEqual(order1);
	expect(order3).toEqual(order1);
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
		if (!a.get()) {
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
    const currentSub = setActiveSub();
		const isOne = src2.get() === 1;
    setActiveSub(currentSub);
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
	src1.set(src1.get()! + 1);

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

test('should handle effect recursion for the first execution', () => {
  const src1 = signal(0);
  const src2 = signal(0);

  let triggers1 = 0;
  let triggers2 = 0;

  effect(() => {
    triggers1++;
    src1.set(Math.min(src1.get() + 1, 5));
  });
  effect(() => {
    triggers2++;
    src2.set(Math.min(src2.get() + 1, 5));
    src2.get();
  });

  expect(triggers1).toBe(1);
  expect(triggers2).toBe(1);
});

test('should support custom recurse effect', () => {
  const src = signal(0);

  let triggers = 0;

  effect(() => {
    getActiveSub()!.flags &= ~ReactiveFlags.RecursedCheck;
    triggers++;
    src.set(Math.min(src.get() + 1, 5));
  });

  expect(triggers).toBe(6);
});

test('should not execute skipped effects from previous failed flush when updating unrelated signal', () => {
  const a = signal(0);
  const b = signal(0);
  const c = signal(0);
  const d = computed(() => (c.get(), 0));

  let effect3Executed = false;

  effect(() => {
    a.get();
  });
  effect(() => {
    if (a.get() === 2) {
      throw new Error('Error in effect 2');
    }
  });
  effect(() => {
    a.get();
    d.get();
    effect3Executed = true;
  });
  effect(() => {
    b.get();
  });

  a.set(1);

  effect3Executed = false;
  try {
    a.set(2);
  } catch (e) {
    expect((e as Error).message).toBe('Error in effect 2');
  }

  expect(effect3Executed).toBe(false);
  b.set(1);
  expect(effect3Executed).toBe(false);
  c.set(1);
  expect(effect3Executed).toBe(true);
});

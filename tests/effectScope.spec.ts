import { test, expect } from 'vitest';
import { effect, effectScope, signal } from '../dist';

test('should not trigger after stop', () => {
	const count = signal(1);

	let triggers = 0;
	// effect1;

	const stopScope = effectScope(() => {
    effect(() => {
      triggers++;
      count.get();
    });
		expect(triggers).toBe(1);

		count.set(2);
		expect(triggers).toBe(2);
	});

	count.set(3);
	expect(triggers).toBe(3);
	stopScope();
	count.set(4);
	expect(triggers).toBe(3);
});

test('should dispose inner effects if created in an effect', () => {
  const source = signal(1);

  let triggers = 0;

  effect(() => {
    const dispose = effectScope(() => {
      effect(() => {
        source.get();
        triggers++;
      });
    });
    expect(triggers).toBe(1);

    source.set(2);
    expect(triggers).toBe(2);
    dispose();
    source.set(3);
    expect(triggers).toBe(2);
  });
});

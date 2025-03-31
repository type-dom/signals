import { effect, effectScope, signal } from '../src';

test('should not trigger after stop', () => {
	const count = signal(1);

	let triggers = 0;
	let effect1;

	const stopScope = effectScope(() => {
		effect1 = effect(() => {
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

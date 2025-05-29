import { test } from 'vitest';
import { signal, watch } from '../dist';

test('#48', () => {
	const source = signal(0);
	let disposeInner: () => void;

	watch(
		() => source.get(),
		(val) => {
			if (val === 1) {
				disposeInner = watch(
					() => source.get(),
					() => { /**/ }
				);
			} else if (val === 2) {
				disposeInner!();
			}
		}
	);

	source.set(1);
	source.set(2);
	source.set(3);
});

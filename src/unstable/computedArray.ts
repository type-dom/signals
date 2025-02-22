import { computed, ISignal } from '../index';

export function computedArray<I, O>(
	arr: ISignal<I[]>,
	getter: (item: I, index: number) => O
) {
	const length = computed(() => arr.get().length);
	const keys = computed(
		() => {
			const keys: string[] = [];
			for (let i = 0; i < length.get(); i++) {
				keys.push(String(i));
			}
			return keys;
		}
	);
	const items = computed<ISignal<O>[]>(
		(array) => {
			array ??= [];
			while (array.length < length.get()) {
				const index = array.length;
				const item = computed(() => arr.get()[index]);
				array.push(computed(() => getter(item.get(), index)));
			}
			if (array.length > length.get()) {
				array.length = length.get();
			}
			return array;
		}
	);

	return new Proxy({}, {
		get(_, p, receiver) {
			if (p === 'length') {
				return length.get();
			}
			if (typeof p === 'string' && !isNaN(Number(p))) {
				return items.get()[Number(p)]?.get();
			}
			return Reflect.get(items.get(), p, receiver);
		},
		has(_, p) {
			return Reflect.has(items.get(), p);
		},
		ownKeys() {
			return keys.get();
		},
	}) as unknown as readonly Readonly<O>[];
}

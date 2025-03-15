// import { computed, ISignal } from '../index';
//
// export function computedSet<T>(source: ISignal<Set<T>>): ISignal<Set<T>> {
// 	return computed<Set<T>>(
// 		(oldValue) => {
// 			const newValue = source.get();
// 			if (oldValue?.size === newValue.size && [...oldValue].every(c => newValue.has(c))) {
// 				return oldValue;
// 			}
// 			return newValue;
// 		}
// 	);
// }

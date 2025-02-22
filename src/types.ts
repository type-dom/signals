export interface ISignal<T = any> {
	get(): T;
}

export interface IWritableSignal<S = any> extends ISignal<S> {
	set(value: S): void;
}

// add by me lineto vuejs
export type ComputedGetter<T> = (oldValue?: T) => T;
export type ComputedSetter<T> = (newValue: T) => void;

export interface WritableComputedOptions<T = any, S = T> {
	get: ComputedGetter<T>
	set: ComputedSetter<S>
}

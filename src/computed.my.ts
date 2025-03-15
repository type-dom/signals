// import { activeSub, setActiveSub } from './effect';
// import { checkDirty, endTracking, link, propagate, startTracking, ILink, SubscriberFlags } from './system';
// import type { ComputedGetter, ComputedSetter, IWritableSignal, WritableComputedOptions } from './types';
// import { isFunction } from '@type-dom/utils';
// import { IComputed } from './computed';
//
// /**
//  * Takes a getter function and returns a readonly reactive ref object for the
//  * returned value from the getter. It can also take an object with get and set
//  * functions to create a writable ref object.
//  *
//  * @example
//  * ```js
//  * // Creating a readonly computed ref:
//  * const count = ref(1)
//  * const plusOne = computed(() => count.value + 1)
//  *
//  * console.log(plusOne.value) // 2
//  * plusOne.value++ // error
//  * ```
//  *
//  * ```js
//  * // Creating a writable computed ref:
//  * const count = ref(1)
//  * const plusOne = computed({
//  *   get: () => count.value + 1,
//  *   set: (val) => {
//  *     count.value = val - 1
//  *   }
//  * })
//  *
//  * plusOne.value = 1
//  * console.log(count.value) // 0
//  * ```
//  *
//  * @param getter - Function that produces the next value.
//  * @param debugOptions - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
//  * @see {@link https://vuejs.org/api/reactivity-core.html#computed}
//  */
// export function computed<T>(getter: ComputedGetter<T>): Computed<T>
// export function computed<T, S = T>(options: WritableComputedOptions<T, S>): Computed<T>
// export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>): Computed<T> {
// // export function computed<T>(getter: (cachedValue?: T) => T): Computed<T> {
// 	return new Computed<T>(getterOrOptions);
// }
//
// export class Computed<T = any> implements IComputed<T> {
// // export class Computed<T = any, S = T> implements IComputed, ISignal<T> {
// 	cachedValue: T | undefined = undefined;
// 	version = 0;
//
// 	// Dependency
// 	subs: ILink | undefined = undefined;
// 	subsTail: ILink | undefined = undefined;
// 	lastTrackedId = 0;
//
// 	// Subscriber
// 	deps: ILink | undefined = undefined;
// 	depsTail: ILink | undefined = undefined;
// 	flags: SubscriberFlags = SubscriberFlags.Dirty;
//
// 	getter: ComputedGetter<T>
// 	setter: ComputedSetter<T> | undefined
// 	constructor(
// 		getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
// 	) {
// 		if (isFunction(getterOrOptions)) {
// 			this.getter = getterOrOptions
// 		} else {
// 			this.getter = getterOrOptions.get
// 			this.setter = getterOrOptions.set
// 		}
// 	}
//
// 	get(): T {
// 		const flags = this.flags;
// 		// if (flags & SubscriberFlags.Dirty) {
// 		// 	this.update();
// 		// } else if (flags & SubscriberFlags.ToCheckDirty) {
// 		// 	if (checkDirty(this.deps!)) {
// 		// 		this.update();
// 		// 	} else {
// 		// 		this.flags &= ~SubscriberFlags.ToCheckDirty;
// 		// 	}
// 		// }
// 		// if (activeTrackId && this.lastTrackedId !== activeTrackId) {
// 		// 	this.lastTrackedId = activeTrackId;
// 		// 	// link(this, activeSub!).version = this.version;
// 		// }
// 		if (this.setter) {
// 			return this.getter();
// 		}
// 		return this.cachedValue!;
// 	}
//
// 	// add by me
// 	set(value: T) {
// 		if (this.setter) {
// 			this.setter(value)
// 		}
// 		// if (this.cachedValue !== (this.cachedValue = value)) {
// 		// 	const subs = this.subs;
// 		// 	if (subs !== undefined) {
// 		// 		propagate(subs);
// 		// 	}
// 		// }
// 		const prevSub = activeSub;
// 		// const prevTrackId = activeTrackId;
// 		// setActiveSub(this, nextTrackId());
// 		startTracking(this);
// 		const oldValue = this.cachedValue;
// 		let newValue;
// 		try {
// 			newValue = this.getter();
// 		} finally {
// 			// setActiveSub(prevSub, prevTrackId);
// 			endTracking(this);
// 		}
// 		if (oldValue !== newValue) {
// 			this.cachedValue = newValue;
// 			this.version++;
// 			return true;
// 		}
// 		return false;
// 	}
//
// 	update(): boolean {
// 		const prevSub = activeSub;
// 		// const prevTrackId = activeTrackId;
// 		// setActiveSub(this, nextTrackId());
// 		startTracking(this);
// 		const oldValue = this.cachedValue;
// 		let newValue;
// 		try {
// 			newValue = this.getter(oldValue);
// 		} finally {
// 			// setActiveSub(prevSub, prevTrackId);
// 			endTracking(this);
// 		}
// 		if (oldValue !== newValue) {
// 			this.cachedValue = newValue;
// 			this.version++;
// 			return true;
// 		}
// 		return false;
// 	}
// }

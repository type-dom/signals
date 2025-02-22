import { activeSub, setActiveSub } from './effect';
import { activeEffectScope } from './effectScope';
import {
	endTrack,
	IComputed,
	ILink,
	isDirty,
	link,
	propagate,
	shallowPropagate,
	startTrack,
	SubscriberFlags
} from './system';
import type { ComputedGetter, ComputedSetter, ISignal, IWritableSignal, WritableComputedOptions } from './types';
import { isFunction } from '@type-dom/utils';

export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>): Computed<T> {
	return new Computed<T>(getterOrOptions);
}

export class Computed<T = any> implements IComputed, ISignal<T>, IWritableSignal<T> {
	currentValue: T | undefined = undefined;

	// Dependency
	subs: ILink | undefined = undefined;
	subsTail: ILink | undefined = undefined;
	lastTrackedId = 0;

	// Subscriber
	deps: ILink | undefined = undefined;
	depsTail: ILink | undefined = undefined;
	flags: SubscriberFlags = SubscriberFlags.Dirty;

	getter: ComputedGetter<T> // add by me
	setter: ComputedSetter<T> | undefined // add by me
	constructor(
		getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
	) {
		if (isFunction(getterOrOptions)) {
			this.getter = getterOrOptions
		} else {
			this.getter = getterOrOptions.get
			this.setter = getterOrOptions.set
		}
	}

	get(): T {
		const flags = this.flags;
		if (
			flags & (SubscriberFlags.ToCheckDirty | SubscriberFlags.Dirty)
			&& isDirty(this, flags)
		) {
			if (this.update()) {
				const subs = this.subs;
				if (subs !== undefined) {
					shallowPropagate(subs);
				}
			}
		}
		if (activeSub !== undefined) {
			link(this, activeSub);
		} else if (activeEffectScope !== undefined) {
			link(this, activeEffectScope);
		}
		if (this.setter) {
			return this.getter();
		}
		return this.currentValue!;
	}

	// add by me 可编辑的Computed， 根据vuejs的实现
	set(value: T) {
		if (this.setter) { // 只有存在 setter 时才会有
			this.setter(value)
			// if (this.cachedValue !== (this.cachedValue = value)) { // Signal 的实现
				const subs = this.subs;
				if (subs !== undefined) {
					propagate(subs);
				}
			// }
			// update 的实现
			// const prevSub = activeSub;
			// const prevTrackId = activeTrackId;
			// setActiveSub(this, nextTrackId());
			// startTrack(this);
			// const oldValue = this.cachedValue;
			// let newValue;
			// try {
			// 	newValue = value; // this.getter();
			// } finally {
			// 	setActiveSub(prevSub, prevTrackId);
			// 	endTrack(this);
			// }
			// if (oldValue !== newValue) {
			// 	this.cachedValue = newValue;
			// 	this.version++;
			// 	// return true;
			// }
			// return false;
		}
	}

	update(): boolean {
		const prevSub = activeSub;
		setActiveSub(this);
		startTrack(this);
		try {
			const oldValue = this.currentValue;
			const newValue = this.getter(oldValue);
			if (oldValue !== newValue) {
				this.currentValue = newValue;
				return true;
			}
			return false;
		} finally {
			setActiveSub(prevSub);
			endTrack(this);
		}
	}
}

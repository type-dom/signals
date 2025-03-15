import { activeSub } from './effect';
import { activeScope } from './effectScope';
import {
	ILink,
	SubscriberFlags, ISubscriber,
	link,
	propagate,
	processEffectNotifications, processComputedUpdate
} from './system';
import { ISignal } from './signal';
import { batchDepth } from './batch';

// add by me lineto vuejs
export type ComputedGetter<T, S> = (cachedValue?: S) => T;
export type ComputedSetter<T> = (newValue: T) => void;

export function computed<T>(getter: (cachedValue?: any) => T, setter?: (newValue: any) => void): Computed<T> {
	return new Computed(getter, setter);
}

export interface IComputed<T, S = T> extends ISignal<T | undefined>, ISubscriber {
	getter: (cachedValue?: S) => T;
	setter?: (newValue: S) => void;
}

export class Computed<T> implements IComputed<T> {
	currentValue?: T;

	// Dependency
	subs?: ILink;
	subsTail?: ILink;
	lastTrackedId = 0;

	// Subscriber
	deps?: ILink;
	depsTail?: ILink;
	flags: SubscriberFlags;

	getter: (cachedValue?: any) => T; // add by me
	setter?: (newValue: any) => void; // add by me
	constructor(getter: (cachedValue?: any) => T, setter?: (newValue: any) => void) {
		// this.currentValue = undefined;
		// this.subs = undefined;
		// this.subsTail = undefined;
		// this.deps = undefined;
		// this.depsTail = undefined;
		this.flags = SubscriberFlags.Computed | SubscriberFlags.Dirty;
		this.getter = getter;
		if (setter) {
			this.setter = setter;
		}
	}

	get() {
		// console.error('Computed get . ');
		const flags = this.flags;
		if (flags & (SubscriberFlags.Dirty | SubscriberFlags.PendingComputed)) {
			processComputedUpdate(this, flags);
		}
		if (activeSub !== undefined) {
			link(this, activeSub);
		} else if (activeScope !== undefined) {
			link(this, activeScope);
		}
		return this.currentValue as T;
	}

	// add by me 可编辑的Computed， 根据vuejs的实现
	set(value: any) {
		console.warn('Computed set . ');
		if (this.setter) { // 只有存在 setter 时才会有
			this.setter(value);

			const subs = this.subs;
			if (subs !== undefined) {
				propagate(subs);
				if (!batchDepth) {
					processEffectNotifications();
				}
			}
		}
		// else {
		// 	this.currentValue = value // add by me
		// }
		// if (this.currentValue !== (this.currentValue = value)) { // Signal 的实现

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

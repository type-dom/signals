import { batchDepth } from './batch';
import { activeSub } from './effect';
import { IDependency, ILink, drainQueuedEffects, link, propagate } from './system';
import type { IWritableSignal } from './types';

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(oldValue: T): Signal<T>;
export function signal<T>(oldValue?: T): Signal<T | undefined> {
	return new Signal(oldValue);
}

export class Signal<T = any> implements IDependency, IWritableSignal<T> {
	// Dependency
	subs: ILink | undefined = undefined;
	subsTail: ILink | undefined = undefined;

	constructor(
		public currentValue: T
	) { }

	get(): T {
		if (activeSub !== undefined) {
			link(this, activeSub);
		}
		return this.currentValue;
	}

	set(value: T): void {
		if (this.currentValue !== value) {
			this.currentValue = value;
			const subs = this.subs;
			if (subs !== undefined) {
				propagate(subs);
				if (!batchDepth) {
					drainQueuedEffects();
				}
			}
		}
	}
}

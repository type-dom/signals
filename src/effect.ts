import { activeScope } from './effectScope';
import {
	IDependency,
	ILink,
	ISubscriber,
	SubscriberFlags,
	link,
	startTracking,
	endTracking,
	processPendingInnerEffects,
	updateDirtyFlag
} from './system';

export let activeSub: ISubscriber | undefined;

export function setActiveSub(sub: ISubscriber | undefined): void {
	activeSub = sub;
}

export function effect<T>(fn: () => T) {
	// console.warn('effect . fn is ', fn);
	const e = new Effect(fn);

	if (activeSub !== undefined) {
		link(e, activeSub);
	} else if (activeScope !== undefined) {
		link(e, activeScope);
	}
	const prevSub = activeSub;
	activeSub = e;
	try {
		e.fn();
	} finally {
		activeSub = prevSub;
	}
	return effectStop.bind(e);
}

export interface IEffect extends ISubscriber, IDependency  {
	fn(): void;
}

export class Effect<T = any> implements IEffect {
	fn: () => T;
	// Dependency
	subs: ILink | undefined ;
	subsTail: ILink | undefined;

	// Subscriber
	deps: ILink | undefined;
	depsTail: ILink | undefined;
	flags: SubscriberFlags;

	constructor(fn: () => T) {
		this.fn = fn;
		this.subs = undefined;
		this.subsTail = undefined;

		// Subscriber
		this.deps = undefined;
		this.depsTail = undefined;
		this.flags = SubscriberFlags.Effect;
	}
}

//#region Internal functions
export function notifyEffect(e: IEffect): boolean {
	const flags = e.flags;
	if (
		flags & SubscriberFlags.Dirty
		|| (flags & SubscriberFlags.PendingComputed && updateDirtyFlag(e, flags))
	) {
		const prevSub = activeSub;
		activeSub = e;
		startTracking(e);
		try {
			e.fn();
		} finally {
			activeSub = prevSub;
			endTracking(e);
		}
	} else {
		processPendingInnerEffects(e, e.flags);
	}
	return true;
}

export function effectStop(this: ISubscriber): void {
	// console.warn('effectStop . ');
	startTracking(this);
	endTracking(this);
}
//#endregion

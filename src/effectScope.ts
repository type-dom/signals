import { effectStop } from './effect';
import {
	endTracking,
	processPendingInnerEffects,
	startTracking,
	ILink,
	ISubscriber,
	SubscriberFlags,
} from './system';

export let activeScope: EffectScope | undefined = undefined;

export function setActiveScope(sub: EffectScope | undefined): void {
	activeScope = sub;
}

export function effectScope<T>(fn: () => T) {
	const e = new EffectScope();
	const prevSub = activeScope;
	activeScope = e;
	try {
		fn();
	} finally {
		activeScope = prevSub;
	}
	return effectStop.bind(e);
}

export interface IEffectScope extends ISubscriber {
	isScope: true;
}

export class EffectScope implements IEffectScope {
	// Subscriber
	deps: ILink | undefined;
	depsTail: ILink | undefined;
	flags: SubscriberFlags;
	isScope: true;

	/**
	 * @internal add by me to support onScopeDispose
	 */
	cleanups: (() => void)[] = []

	constructor() {
		this.deps = undefined;
		this.depsTail = undefined;
		this.flags = SubscriberFlags.Effect;
		this.isScope = true;
	}
	// notify(): void {
	// 	const flags = this.flags;
	// 	if (flags & SubscriberFlags.InnerEffectsPending) {
	// 		this.flags = flags & ~SubscriberFlags.InnerEffectsPending;
	// 		runInnerEffects(this.deps!);
	// 	}
	// }
	//
	// run<T>(fn: () => T): T {
	// 	const prevSub = activeScope;
	// 	setActiveScope(this);
	// 	try {
	// 		return fn();
	// 	} finally {
	// 		setActiveScope(prevSub);
	// 	}
	// }

	// stop(): void {
	// 	for (let i = 0, l = this.cleanups.length; i < l; i++) {
	// 		this.cleanups[i]()
	// 	}
	// 	this.cleanups.length = 0
	// 	startTracking(this);
	// 	endTracking(this);
	// }
}


/**
 * Returns the current active effect scope if there is one.
 * add by me
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#getcurrentscope}
 */
export function getCurrentScope(): EffectScope | undefined {
	return activeScope
}

/**
 * alien-signals 中没有这个方法，难道是移除了？
 * Registers a dispose callback on the current active effect scope. The
 * callback will be invoked when the associated effect scope is stopped.
 *
 * @param fn - The callback function to attach to the scope's cleanup.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#onscopedispose}
 */
export function onScopeDispose(fn: () => void, failSilently = false): void {
	if (activeScope) {
		activeScope.cleanups.push(fn)
	}
	else if (!failSilently) {
		console.warn(
			`onScopeDispose() is called when there is no active effect scope` +
			` to be associated with.`,
		)
	}
}

export function notifyEffectScope(e: IEffectScope): boolean {
	const flags = e.flags;
	if (flags & SubscriberFlags.PendingEffect) {
		processPendingInnerEffects(e, e.flags);
		return true;
	}
	return false;
}

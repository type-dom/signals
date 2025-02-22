import { endTrack, ILink, ISubscriber, runInnerEffects, startTrack, SubscriberFlags } from './system';

export let activeEffectScope: EffectScope | undefined = undefined;

export function untrackScope<T>(fn: () => T): T {
	const prevSub = activeEffectScope;
	setActiveScope(undefined);
	try {
		return fn();
	} finally {
		setActiveScope(prevSub);
	}
}

export function setActiveScope(sub: EffectScope | undefined): void {
	activeEffectScope = sub;
}

export function effectScope(): EffectScope {
	return new EffectScope();
}

export class EffectScope implements ISubscriber {
	// Subscriber
	deps: ILink | undefined = undefined;
	depsTail: ILink | undefined = undefined;
	flags: SubscriberFlags = SubscriberFlags.None;

	/**
	 * @internal add by me to support onScopeDispose
	 */
	cleanups: (() => void)[] = []

	notify(): void {
		const flags = this.flags;
		if (flags & SubscriberFlags.InnerEffectsPending) {
			this.flags = flags & ~SubscriberFlags.InnerEffectsPending;
			runInnerEffects(this.deps!);
		}
	}

	run<T>(fn: () => T): T {
		const prevSub = activeEffectScope;
		setActiveScope(this);
		try {
			return fn();
		} finally {
			setActiveScope(prevSub);
		}
	}

	stop(): void {
		for (let i = 0, l = this.cleanups.length; i < l; i++) {
			this.cleanups[i]()
		}
		this.cleanups.length = 0
		startTrack(this);
		endTrack(this);
	}
}


/**
 * Returns the current active effect scope if there is one.
 * add by me
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#getcurrentscope}
 */
export function getCurrentScope(): EffectScope | undefined {
	return activeEffectScope
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
	if (activeEffectScope) {
		activeEffectScope.cleanups.push(fn)
	}
	else if (!failSilently) {
		console.warn(
			`onScopeDispose() is called when there is no active effect scope` +
			` to be associated with.`,
		)
	}
}

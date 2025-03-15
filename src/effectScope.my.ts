// // import { nextTrackId } from './effect';
// import { endTracking, startTracking, ILink, ISubscriber, SubscriberFlags } from './system';
// // import { warn } from '@type-dom/framework';
//
// export let activeScope: EffectScope | undefined = undefined;
// export let activeScopeTrackId = 0;
//
// export function effectScope(): EffectScope {
// 	return new EffectScope();
// }
//
// export class EffectScope implements ISubscriber {
// 	// Subscriber
// 	deps: ILink | undefined = undefined;
// 	depsTail: ILink | undefined = undefined;
// 	flags: SubscriberFlags = SubscriberFlags.None;
//
// 	// trackId: number = nextTrackId();
//
// 	/**
// 	 * @internal add by me to support onScopeDispose
// 	 */
// 	cleanups: (() => void)[] = []
//
// 	notify(): void {
// 		const flags = this.flags;
// 		if (flags & SubscriberFlags.InnerEffectsPending) {
// 			this.flags = flags & ~SubscriberFlags.InnerEffectsPending;
// 			let link = this.deps!;
// 			do {
// 				const dep = link.dep;
// 				if ('notify' in dep) {
// 					dep.notify();
// 				}
// 				link = link.nextDep!;
// 			} while (link !== undefined);
// 		}
// 	}
//
// 	run<T>(fn: () => T): T {
// 		const prevSub = activeScope;
// 		const prevTrackId = activeScopeTrackId;
// 		activeScope = this;
// 		// activeScopeTrackId = this.trackId;
// 		try {
// 			return fn();
// 		} finally {
// 			activeScope = prevSub;
// 			activeScopeTrackId = prevTrackId;
// 		}
// 	}
//
// 	stop(): void {
// 		for (let i = 0, l = this.cleanups.length; i < l; i++) {
// 			this.cleanups[i]()
// 		}
// 		this.cleanups.length = 0
// 		startTracking(this);
// 		endTracking(this);
// 	}
// }
//
//
// /**
//  * Returns the current active effect scope if there is one.
//  * add by me
//  * @see {@link https://vuejs.org/api/reactivity-advanced.html#getcurrentscope}
//  */
// export function getCurrentScope(): EffectScope | undefined {
// 	return activeScope
// }
//
// /**
//  * alien-signals 中没有这个方法，难道是移除了？
//  * Registers a dispose callback on the current active effect scope. The
//  * callback will be invoked when the associated effect scope is stopped.
//  *
//  * @param fn - The callback function to attach to the scope's cleanup.
//  * @see {@link https://vuejs.org/api/reactivity-advanced.html#onscopedispose}
//  */
// export function onScopeDispose(fn: () => void, failSilently = false): void {
// 	if (activeScope) {
// 		activeScope.cleanups.push(fn)
// 	}
// 	else if (!failSilently) {
// 		console.warn(
// 			`onScopeDispose() is called when there is no active effect scope` +
// 			` to be associated with.`,
// 		)
// 	}
// }

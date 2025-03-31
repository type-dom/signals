import { activeSub, IEffect, notifyEffect, setActiveSub } from './effect';
import { IComputed } from './computed';
import { IEffectScope, notifyEffectScope } from './effectScope';

export interface IDependency {
	subs?: ILink;
	subsTail?: ILink;
}

export interface ISubscriber {
	flags: SubscriberFlags;
	deps?: ILink;
	depsTail?: ILink;
}

export interface ILink {
	dep: IDependency | (IDependency & ISubscriber);
	sub: ISubscriber | (IDependency & ISubscriber);
	prevSub?: ILink;
	nextSub?: ILink;
	nextDep?: ILink;
}

interface OneWayLink<T> {
	target: T;
	linked: OneWayLink<T> | undefined;
}

export const enum SubscriberFlags {
	Computed = 1 << 0,
	Effect = 1 << 1,
	Tracking = 1 << 2,
	Notified = 1 << 3,
	Recursed = 1 << 4,
	Dirty = 1 << 5,
	PendingComputed = 1 << 6,
	PendingEffect = 1 << 7,
	Propagated = Dirty | PendingComputed | PendingEffect,
}

export function createReactiveSystem({
	updateComputed,
	notifyEffect,
}: {
/**
* Updates the computed subscriber's value and returns whether it changed.
*
* This function should be called when a computed subscriber is marked as Dirty.
* The computed subscriber's getter function is invoked, and its value is updated.
* If the value changes, the new value is stored, and the function returns `true`.
*
* @param computed - The computed subscriber to update.
* @returns `true` if the computed subscriber's value changed; otherwise `false`.
*/
updateComputed(computed: IDependency & ISubscriber): boolean;
/**
* Handles effect notifications by processing the specified `effect`.
*
* When an `effect` first receives any of the following flags:
*   - `Dirty`
*   - `PendingComputed`
*   - `PendingEffect`
* this method will process them and return `true` if the flags are successfully handled.
* If not fully handled, future changes to these flags will trigger additional calls
* until the method eventually returns `true`.
*/
notifyEffect(effect: ISubscriber): boolean;
}) {
	const notifyBuffer: (ISubscriber | undefined)[] = [];

	let notifyIndex = 0;
	let notifyBufferLength = 0;

	return {
		link,
		propagate,
		updateDirtyFlag,
		startTracking,
		endTracking,
		processEffectNotifications,
		processComputedUpdate,
		processPendingInnerEffects,
	};

	/**
	 * Links a given dependency and subscriber if they are not already linked.
	 *
	 * @param dep - The dependency to be linked.
	 * @param sub - The subscriber that depends on this dependency.
	 * @returns The newly created link object if the two are not already linked; otherwise `undefined`.
	 */
	function link(dep: IDependency, sub: ISubscriber): ILink | undefined {
		const currentDep = sub.depsTail;
		if (currentDep !== undefined && currentDep.dep === dep) {
			return;
		}
		const nextDep = currentDep !== undefined ? currentDep.nextDep : sub.deps;
		if (nextDep !== undefined && nextDep.dep === dep) {
			sub.depsTail = nextDep;
			return;
		}
		const depLastSub = dep.subsTail;
		if (depLastSub !== undefined && depLastSub.sub === sub && isValidLink(depLastSub, sub)) {
			return;
		}
		return linkNewDep(dep, sub, nextDep, currentDep);
	}

	/**
	 * Traverses and marks subscribers starting from the provided link.
	 *
	 * It sets flags (e.g., Dirty, PendingComputed, PendingEffect) on each subscriber
	 * to indicate which ones require re-computation or effect processing.
	 * This function should be called after a signal's value changes.
	 *
	 * @param current - The starting link from which propagation begins.
	 */
	function propagate(current: ILink): void {
		let next = current.nextSub;
		let branchs: OneWayLink<ILink | undefined> | undefined;
		let branchDepth = 0;
		let targetFlag = SubscriberFlags.Dirty;

		top: do {
			const sub = current.sub;
			const subFlags = sub.flags;

			let shouldNotify = false;

			if (!(subFlags & (SubscriberFlags.Tracking | SubscriberFlags.Recursed | SubscriberFlags.Propagated))) {
				sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
				shouldNotify = true;
			} else if ((subFlags & SubscriberFlags.Recursed) && !(subFlags & SubscriberFlags.Tracking)) {
				sub.flags = (subFlags & ~SubscriberFlags.Recursed) | targetFlag | SubscriberFlags.Notified;
				shouldNotify = true;
			} else if (!(subFlags & SubscriberFlags.Propagated) && isValidLink(current, sub)) {
				sub.flags = subFlags | SubscriberFlags.Recursed | targetFlag | SubscriberFlags.Notified;
				shouldNotify = (sub as IDependency).subs !== undefined;
			}

			if (shouldNotify) {
				const subSubs = (sub as IDependency).subs;
				if (subSubs !== undefined) {
					current = subSubs;
					if (subSubs.nextSub !== undefined) {
						branchs = { target: next, linked: branchs };
						++branchDepth;
						next = current.nextSub;
						targetFlag = SubscriberFlags.PendingComputed;
					} else {
						targetFlag = subFlags & SubscriberFlags.Effect
							? SubscriberFlags.PendingEffect
							: SubscriberFlags.PendingComputed;
					}
					continue;
				}
				if (subFlags & SubscriberFlags.Effect) {
					notifyBuffer[notifyBufferLength++] = sub;
				}
			} else if (!(subFlags & (SubscriberFlags.Tracking | targetFlag))) {
				sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
				if ((subFlags & (SubscriberFlags.Effect | SubscriberFlags.Notified)) === SubscriberFlags.Effect) {
					notifyBuffer[notifyBufferLength++] = sub;
				}
			} else if (
				!(subFlags & targetFlag)
				&& (subFlags & SubscriberFlags.Propagated)
				&& isValidLink(current, sub)
			) {
				sub.flags = subFlags | targetFlag;
			}

			if ((current = next!) !== undefined) {
				next = current.nextSub;
				targetFlag = branchDepth
					? SubscriberFlags.PendingComputed
					: SubscriberFlags.Dirty;
				continue;
			}

			while (branchDepth--) {
				current = branchs!.target!;
				branchs = branchs!.linked;
				if (current !== undefined) {
					next = current.nextSub;
					targetFlag = branchDepth
						? SubscriberFlags.PendingComputed
						: SubscriberFlags.Dirty;
					continue top;
				}
			}

			break;
			// eslint-disable-next-line no-constant-condition
		} while (true);
	}

	/**
	 * Prepares the given subscriber to track new dependencies.
	 *
	 * It resets the subscriber's internal pointers (e.g., depsTail) and
	 * sets its flags to indicate it is now tracking dependency links.
	 *
	 * @param sub - The subscriber to start tracking.
	 */
	function startTracking(sub: ISubscriber): void {
		sub.depsTail = undefined;
		sub.flags = (sub.flags & ~(SubscriberFlags.Notified | SubscriberFlags.Recursed | SubscriberFlags.Propagated)) | SubscriberFlags.Tracking;
	}

	/**
	 * Concludes tracking of dependencies for the specified subscriber.
	 *
	 * It clears or unlinks any tracked dependency information, then
	 * updates the subscriber's flags to indicate tracking is complete.
	 *
	 * @param sub - The subscriber whose tracking is ending.
	 */
	function endTracking(sub: ISubscriber): void {
		const depsTail = sub.depsTail;
		if (depsTail !== undefined) {
			const nextDep = depsTail.nextDep;
			if (nextDep !== undefined) {
				clearTracking(nextDep);
				depsTail.nextDep = undefined;
			}
		} else if (sub.deps !== undefined) {
			clearTracking(sub.deps);
			sub.deps = undefined;
		}
		sub.flags &= ~SubscriberFlags.Tracking;
	}

	/**
	 * Updates the dirty flag for the given subscriber based on its dependencies.
	 *
	 * If the subscriber has any pending computeds, this function sets the Dirty flag
	 * and returns `true`. Otherwise, it clears the PendingComputed flag and returns `false`.
	 *
	 * @param sub - The subscriber to update.
	 * @param flags - The current flag set for this subscriber.
	 * @returns `true` if the subscriber is marked as Dirty; otherwise `false`.
	 */
	function updateDirtyFlag(sub: ISubscriber, flags: SubscriberFlags): boolean {
		if (checkDirty(sub.deps!)) {
			sub.flags = flags | SubscriberFlags.Dirty;
			return true;
		} else {
			sub.flags = flags & ~SubscriberFlags.PendingComputed;
			return false;
		}
	}

	/**
	 * Updates the computed subscriber if necessary before its value is accessed.
	 *
	 * If the subscriber is marked Dirty or PendingComputed, this function runs
	 * the provided updateComputed logic and triggers a shallowPropagate for any
	 * downstream subscribers if an actual update occurs.
	 *
	 * @param computed - The computed subscriber to update.
	 * @param flags - The current flag set for this subscriber.
	 */
	function processComputedUpdate(computed: IDependency & ISubscriber, flags: SubscriberFlags): void {
		if (flags & SubscriberFlags.Dirty || checkDirty(computed.deps!)) {
			if (updateComputed(computed)) {
				const subs = computed.subs;
				if (subs !== undefined) {
					shallowPropagate(subs);
				}
			}
		} else {
			computed.flags = flags & ~SubscriberFlags.PendingComputed;
		}
	}

	/**
	 * Ensures all pending internal effects for the given subscriber are processed.
	 *
	 * This should be called after an effect decides not to re-run itself but may still
	 * have dependencies flagged with PendingEffect. If the subscriber is flagged with
	 * PendingEffect, this function clears that flag and invokes `notifyEffect` on any
	 * related dependencies marked as Effect and Propagated, processing pending effects.
	 *
	 * @param sub - The subscriber which may have pending effects.
	 * @param flags - The current flags on the subscriber to check.
	 */
	function processPendingInnerEffects(sub: ISubscriber, flags: SubscriberFlags): void {
		if (flags & SubscriberFlags.PendingEffect) {
			sub.flags = flags & ~SubscriberFlags.PendingEffect;
			let link = sub.deps!;
			do {
				const dep = link.dep;
				if (
					'flags' in dep
					&& dep.flags & SubscriberFlags.Effect
					&& dep.flags & SubscriberFlags.Propagated
				) {
					notifyEffect(dep);
				}
				link = link.nextDep!;
			} while (link !== undefined);
		}
	}

	/**
	 * Processes queued effect notifications after a batch operation finishes.
	 *
	 * Iterates through all queued effects, calling notifyEffect on each.
	 * If an effect remains partially handled, its flags are updated, and future
	 * notifications may be triggered until fully handled.
	 */
	function processEffectNotifications(): void {
		while (notifyIndex < notifyBufferLength) {
			const effect = notifyBuffer[notifyIndex]!;
			notifyBuffer[notifyIndex++] = undefined;
			if (!notifyEffect(effect)) {
				effect.flags &= ~SubscriberFlags.Notified;
			}
		}
		notifyIndex = 0;
		notifyBufferLength = 0;
	}


	/**
	 * Creates and attaches a new link between the given dependency and subscriber.
	 *
	 * Reuses a link object from the linkPool if available. The newly formed link
	 * is added to both the dependency's linked list and the subscriber's linked list.
	 *
	 * @param dep - The dependency to link.
	 * @param sub - The subscriber to be attached to this dependency.
	 * @param nextDep - The next link in the subscriber's chain.
	 * @param depsTail - The current tail link in the subscriber's chain.
	 * @returns The newly created link object.
	 */
	function linkNewDep(dep: IDependency, sub: ISubscriber, nextDep: ILink | undefined, depsTail: ILink | undefined): ILink {
		// console.warn('linkNewDep , dep is ', dep, ' sub is ', sub, ' nextDep is ', nextDep, ' depsTail is ', depsTail);
		const newLink: ILink = {
			dep,
			sub,
			nextDep,
			prevSub: undefined,
			nextSub: undefined,
		};
		if (depsTail === undefined) {
			sub.deps = newLink;
		} else {
			depsTail.nextDep = newLink;
		}
		if (dep.subs === undefined) {
			dep.subs = newLink;
		} else {
			const oldTail = dep.subsTail!;
			newLink.prevSub = oldTail;
			oldTail.nextSub = newLink;
		}
		sub.depsTail = newLink;
		dep.subsTail = newLink;

		return newLink;
	}

	/**
	 * Recursively checks and updates all computed subscribers marked as pending.
	 *
	 * It traverses the linked structure using a stack mechanism. For each computed
	 * subscriber in a pending state, updateComputed is called and shallowPropagate
	 * is triggered if a value changes. Returns whether any updates occurred.
	 *
	 * @param current
	 */
	function checkDirty(current: ILink): boolean {
		let prevLinks: OneWayLink<ILink> | undefined;
		let checkDepth = 0;
		let dirty: boolean;

		top: do {
			dirty = false;
			const dep = current.dep;

			if (current.sub.flags & SubscriberFlags.Dirty) {
				dirty = true;
			} else if ('flags' in dep) {
				const depFlags = dep.flags;
				if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.Dirty)) === (SubscriberFlags.Computed | SubscriberFlags.Dirty)) {
					if (updateComputed(dep)) {
						const subs = dep.subs!;
						if (subs.nextSub !== undefined) {
							shallowPropagate(subs);
						}
						dirty = true;
					}
				} else if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) === (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) {
					if (current.nextSub !== undefined || current.prevSub !== undefined) {
						prevLinks = { target: current, linked: prevLinks };
					}
					current = dep.deps!;
					++checkDepth;
					continue;
				}
			}

			if (!dirty && current.nextDep !== undefined) {
				current = current.nextDep;
				continue;
			}

			while (checkDepth) {
				--checkDepth;
				const sub = current.sub as IDependency & ISubscriber;
				const firstSub = sub.subs!;
				if (dirty) {
					if (updateComputed(sub)) {
						if (firstSub.nextSub !== undefined) {
							current = prevLinks!.target;
							prevLinks = prevLinks!.linked;
							shallowPropagate(firstSub);
						} else {
							current = firstSub;
						}
						continue;
					}
				} else {
					sub.flags &= ~SubscriberFlags.PendingComputed;
				}
				if (firstSub.nextSub !== undefined) {
					current = prevLinks!.target;
					prevLinks = prevLinks!.linked;
				} else {
					current = firstSub;
				}
				if (current.nextDep !== undefined) {
					current = current.nextDep;
					continue top;
				}
				dirty = false;
			}

			return dirty;
			// eslint-disable-next-line no-constant-condition
		} while (true);
	}

	/**
	 * Quickly propagates PendingComputed status to Dirty for each subscriber in the chain.
	 *
	 * If the subscriber is also marked as an effect, it is added to the queuedEffects list
	 * for later processing.
	 *
	 * @param link - The head of the linked list to process.
	 */
	function shallowPropagate(link: ILink): void {
		do {
			const sub = link.sub;
			const subFlags = sub.flags;
			if ((subFlags & (SubscriberFlags.PendingComputed | SubscriberFlags.Dirty)) === SubscriberFlags.PendingComputed) {
				sub.flags = subFlags | SubscriberFlags.Dirty | SubscriberFlags.Notified;
				if ((subFlags & (SubscriberFlags.Effect | SubscriberFlags.Notified)) === SubscriberFlags.Effect) {
					notifyBuffer[notifyBufferLength++] = sub;
				}
			}
			link = link.nextSub!;
		} while (link !== undefined);
	}

	/**
	 * Verifies whether the given link is valid for the specified subscriber.
	 *
	 * It iterates through the subscriber's link list (from sub.deps to sub.depsTail)
	 * to determine if the provided link object is part of that chain.
	 *
	 * @param checkLink - The link object to validate.
	 * @param sub - The subscriber whose link list is being checked.
	 * @returns `true` if the link is found in the subscriber's list; otherwise `false`.
	 */
	function isValidLink(checkLink: ILink, sub: ISubscriber): boolean {
		const depsTail = sub.depsTail;
		if (depsTail !== undefined) {
			let link = sub.deps!;
			do {
				if (link === checkLink) {
					return true;
				}
				if (link === depsTail) {
					break;
				}
				link = link.nextDep!;
			} while (link !== undefined);
		}
		return false;
	}

	/**
	 * Clears dependency-subscription relationships starting at the given link.
	 *
	 * Detaches the link from both the dependency and subscriber, then continues
	 * to the next link in the chain. The link objects are returned to linkPool for reuse.
	 *
	 * @param link - The head of a linked chain to be cleared.
	 */
	function clearTracking(link: ILink): void {
		do {
			const dep = link.dep;
			const nextDep = link.nextDep;
			const nextSub = link.nextSub;
			const prevSub = link.prevSub;

			if (nextSub !== undefined) {
				nextSub.prevSub = prevSub;
			} else {
				dep.subsTail = prevSub;
			}

			if (prevSub !== undefined) {
				prevSub.nextSub = nextSub;
			} else {
				dep.subs = nextSub;
			}

			if (dep.subs === undefined && 'deps' in dep) {
				const depFlags = dep.flags;
				if (!(depFlags & SubscriberFlags.Dirty)) {
					dep.flags = depFlags | SubscriberFlags.Dirty;
				}
				const depDeps = dep.deps;
				if (depDeps !== undefined) {
					link = depDeps;
					dep.depsTail!.nextDep = nextDep;
					dep.deps = undefined;
					dep.depsTail = undefined;
					continue;
				}
			}
			link = nextDep!;
		} while (link !== undefined);
	}
}

export const {
	link,
	propagate,
	updateDirtyFlag,
	startTracking,
	endTracking,
	processEffectNotifications,
	processComputedUpdate,
	processPendingInnerEffects,
} = createReactiveSystem({
	updateComputed<T>(computed: IComputed<T>): boolean {
		const prevSub = activeSub;
		// activeSub = computed;
		setActiveSub(computed);
		startTracking(computed);
		try {
			const oldValue = computed.currentValue;
			const newValue = computed.getter(oldValue);
			if (oldValue !== newValue) {
				computed.currentValue = newValue;
				return true;
			}
			return false;
		} finally {
			// activeSub = prevSub;
			setActiveSub(prevSub);
			endTracking(computed);
		}
	},
	notifyEffect(e: IEffect | IEffectScope) {
		if ('isScope' in e) {
			return notifyEffectScope(e);
		} else {
			return notifyEffect(e);
		}
	},
});

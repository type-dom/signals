<p align="center">
	<img src="assets/logo.png" width="250"><br>
<p>

<p align="center">
	<a href="https://npmjs.com/package/@type-dom/signals"><img src="https://badgen.net/npm/v/@type-dom/signals" alt="npm package"></a>
</p>

<h3 align="center">
    <p>[<a href="https://github.com/YanqingXu/alien-signals-in-lua">Alien Signals in Lua</a>]</p>
    <p>[<a href="https://github.com/medz/alien-signals-dart">Alien Signals in Dart</a>]</p>
    <p>[<a href="https://github.com/Rajaniraiyn/react-alien-signals">React Binding</a>]</p>
</h3>

# alien-signals

The goal of `alien-signals` is to create a ~~push-pull~~ [push-pull-push model](https://github.com/stackblitz/alien-signals/pull/19) based signal library with the lowest overhead.

We have set the following constraints in scheduling logic:

1. No dynamic object fields
2. No use of Array/Set/Map
3. No recursion calls
4. Class properties must be fewer than 10 (https://v8.dev/blog/fast-properties)

Experimental results have shown that with these constraints, it is possible to achieve excellent performance for a Signal library without using sophisticated scheduling strategies. The overall performance of `alien-signals` is approximately 400% that of Vue 3.4's reactivity system.

For more detailed performance comparisons, please visit: https://github.com/transitive-bullshit/js-reactivity-benchmark

## Motivation

To achieve high-performance code generation in https://github.com/vuejs/language-tools, I needed to write some on-demand computed logic using Signals, but I couldn't find a low-cost Signal library that satisfied me.

In the past, I accumulated some knowledge of reactivity systems in https://github.com/vuejs/core/pull/5912, so I attempted to develop `alien-signals` with the goal of creating a Signal library with minimal memory usage and excellent performance.

Since Vue 3.5 switched to a Pull reactivity system in https://github.com/vuejs/core/pull/10397, I continued to research the Push-Pull reactivity system here. It is worth mentioning that I was inspired by the doubly-linked concept, but `alien-signals` does not use a similar implementation.

## Adoptions

- Used in Vue language tools (https://github.com/vuejs/language-tools) for virtual code generation.

- The core reactivity system code was ported to Vue 3.6 and later. (https://github.com/vuejs/core/pull/12349)

## Usage

### Basic

```ts
import { signal, computed, effect } from 'alien-signals';

const count = signal(1);
const doubleCount = computed(() => count.get() * 2);

effect(() => {
  console.log(`Count is: ${count.get()}`);
}); // Console: Count is: 1

console.log(doubleCount.get()); // 2

count.set(2); // Console: Count is: 2

console.log(doubleCount.get()); // 4
```

### Effect Scope

```ts
import { signal, effectScope } from 'alien-signals';

const count = signal(1);
const scope = effectScope();

scope.run(() => {
  effect(() => {
    console.log(`Count in scope: ${count.get()}`);
  }); // Console: Count in scope: 1

  count.set(2); // Console: Count in scope: 2
});

scope.stop();

count.set(3); // No console output
```

## About `propagate` and `checkDirty` functions

In order to eliminate recursive calls and improve performance, we record the last link node of the previous loop in `propagate` and `checkDirty` functions, and implement the rollback logic to return to this node.

This results in code that is difficult to understand, and you don't necessarily get the same performance improvements in other languages, so we record the original implementation without eliminating recursive calls here for reference.

#### `propagate`

```ts
function propagate(link: Link, targetFlag = SubscriberFlags.Dirty): void {
	do {
		const sub = link.sub;
		const subFlags = sub.flags;

		if (
			(
				!(subFlags & (SubscriberFlags.Tracking | SubscriberFlags.Recursed | SubscriberFlags.Propagated))
				&& (sub.flags = subFlags | targetFlag | SubscriberFlags.Notified, true)
			)
			|| (
				(subFlags & SubscriberFlags.Recursed)
				&& !(subFlags & SubscriberFlags.Tracking)
				&& (sub.flags = (subFlags & ~SubscriberFlags.Recursed) | targetFlag | SubscriberFlags.Notified, true)
			)
			|| (
				!(subFlags & SubscriberFlags.Propagated)
				&& isValidLink(link, sub)
				&& (
					sub.flags = subFlags | SubscriberFlags.Recursed | targetFlag | SubscriberFlags.Notified,
					(sub as Dependency).subs !== undefined
				)
			)
		) {
			const subSubs = (sub as Dependency).subs;
			if (subSubs !== undefined) {
				propagate(
					subSubs,
					subFlags & SubscriberFlags.Effect
						? SubscriberFlags.PendingEffect
						: SubscriberFlags.PendingComputed
				);
			} else if (subFlags & SubscriberFlags.Effect) {
				if (queuedEffectsTail !== undefined) {
					queuedEffectsTail.depsTail!.nextDep = sub.deps;
				} else {
					queuedEffects = sub;
				}
				queuedEffectsTail = sub;
			}
		} else if (!(subFlags & (SubscriberFlags.Tracking | targetFlag))) {
			sub.flags = subFlags | targetFlag | SubscriberFlags.Notified;
			if ((subFlags & (SubscriberFlags.Effect | SubscriberFlags.Notified)) === SubscriberFlags.Effect) {
				if (queuedEffectsTail !== undefined) {
					queuedEffectsTail.depsTail!.nextDep = sub.deps;
				} else {
					queuedEffects = sub;
				}
				queuedEffectsTail = sub;
			}
		} else if (
			!(subFlags & targetFlag)
			&& (subFlags & SubscriberFlags.Propagated)
			&& isValidLink(link, sub)
		) {
			sub.flags = subFlags | targetFlag;
		}

		link = link.nextSub!;
	} while (link !== undefined);
}
```

#### `checkDirty`

```ts
function checkDirty(link: Link): boolean {
	do {
		const dep = link.dep;
		if ('flags' in dep) {
			const depFlags = dep.flags;
			if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.Dirty)) === (SubscriberFlags.Computed | SubscriberFlags.Dirty)) {
				if (updateComputed(dep)) {
					const subs = dep.subs!;
					if (subs.nextSub !== undefined) {
						shallowPropagate(subs);
					}
					return true;
				}
			} else if ((depFlags & (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) === (SubscriberFlags.Computed | SubscriberFlags.PendingComputed)) {
				if (checkDirty(dep.deps!)) {
					if (updateComputed(dep)) {
						const subs = dep.subs!;
						if (subs.nextSub !== undefined) {
							shallowPropagate(subs);
						}
						return true;
					}
				} else {
					dep.flags = depFlags & ~SubscriberFlags.PendingComputed;
				}
			}
		}
		link = link.nextDep!;
	} while (link !== undefined);

	return false;
}
```

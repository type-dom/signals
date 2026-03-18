# TypeDom Signals API Usage Specification

You are the expert guide for using TypeDom Signals APIs effectively. You help developers understand when and how to use each API correctly, avoid common pitfalls, and implement best practices.

## Context

- **Library**: TypeDom Signals v0.8.1
- **Paradigm**: Push-Pull reactive model
- **Primary Use Case**: State management for TypeDom framework
- **Performance Goal**: 400% faster than traditional reactivity

## Configuration Defaults

| Setting                   | Default       | Description                                                               |
| ------------------------- | ------------- | ------------------------------------------------------------------------- |
| `--auto-batch`            | false         | Automatically batch multiple signal updates                               |
| `--lazy-computed`         | true          | Always use lazy evaluation for computeds                                  |
| `--strict-effect-cleanup` | true          | Require explicit effect cleanup                                           |
| `--scope-management`      | recommended   | Use effectScope for grouped effects                                       |

## Architecture Overview

### Core API Categories

1. **Signal Creation**: `signal<T>()` - Create reactive state
2. **Computed Properties**: `computed<T>()` - Derived state with caching
3. **Side Effects**: `effect()` - Automatic dependency tracking
4. **Scope Management**: `effectScope()` - Lifecycle management
5. **Manual Control**: `trigger()` - Force update propagation
6. **Utilities**: `isSignal()`, `isComputed()`, type guards

### Reactivity Flow

```
User Action → signal.set() → propagate() → queue effects → flush() → UI Update
     ↑              |                                              |
     |              ↓                                              |
computed.get() ← checkDirty() ← update() ← Dirty/Pending flags ←───┘
```

## Signal API

### Basic Usage

#### Creating Signals
```typescript
// ✅ CORRECT: With initial value
const count = signal(0);
const name = signal('TypeDom');

// ✅ CORRECT: With type annotation
const items: Signal<Item[]> = signal();

// ❌ WRONG: Missing type for empty signal
const data = signal(); // Type inference fails
```

**Auto-fix**: TypeScript will infer `Signal<undefined>` for empty signals

#### Reading and Writing
```typescript
// ✅ CORRECT: Use get/set methods
const value = count.get();
count.set(value + 1);

// ❌ WRONG: Direct property access
const value = count.value;  // Violation: not a property
count.value = 1;            // Violation: won't trigger updates
```

### Reference Type Handling

#### Object Updates
```typescript
const user = signal({ name: 'John', age: 30 });

// ✅ CORRECT: Replace entire object
user.set({ ...user.get(), age: 31 });

// ❌ WRONG: Direct mutation
user.get().age = 31;  // Violation: won't trigger update
```

#### Array Updates
```typescript
const items = signal<number[]>([1, 2, 3]);

// ✅ Method 1: Create new array (Recommended)
items.set([...items.get(), 4]);

// ✅ Method 2: Use trigger for mutations
items.get().push(5);
trigger(items);  // Manual trigger

// ❌ WRONG: Mutation without trigger
items.get().push(5);  // Violation: may not trigger
```

**Special Cases**:
- Arrays: Auto-triggers on mutation (special handling in code)
- Maps: Requires trigger()
- DOM Elements: No deep comparison

## Computed API

### Read-only Computed

#### Basic Pattern
```typescript
const count = signal(0);
const double = computed(() => count.get() * 2);

console.log(double.get()); // 0
count.set(5);
console.log(double.get()); // 10 (auto recomputes)
```

#### Caching Behavior
```typescript
const src = signal(0);
let computeCount = 0;

const result = computed(() => {
  computeCount++;
  return src.get() * 2;
});

result.get();        // computeCount = 1
result.get();        // computeCount = 1 (cached!)
src.set(1);          // Marks dirty
result.get();        // computeCount = 2 (recomputed)
```

**Performance**: O(1) for cached reads vs O(n) recalculation

### Writable Computed

#### With Setter
```typescript
const count = signal(0);
const double = computed(
  () => count.get() * 2,           // getter
  (value) => count.set(value / 2)  // setter
);

console.log(double.get()); // 0
double.set(10);            // Calls setter
console.log(count.get());  // 5
```

**Use Case**: Two-way data binding, form inputs

## Effect API

### Basic Effects

#### Automatic Tracking
```typescript
const count = signal(0);

// Creates effect, auto-tracks dependencies
const stop = effect(() => {
  console.log('Count:', count.get());
});
// Immediately executes: "Count: 0"

count.set(1);
// Auto re-executes: "Count: 1"

// Cleanup when done
stop();
```

#### Nested Effects
```typescript
const a = signal(1);
const b = signal(1);

effect(() => {
  if (a.get()) {
    effect(() => {
      b.get();
      console.log('Inner');
    });
  }
});

a.set(0);  // Outer condition fails, inner cleaned up
b.set(2);  // Won't trigger inner effect
```

**Important**: Inner effects are automatically cleaned up when outer condition changes

### Recursive Effects (Advanced)

#### Controlled Recursion
```typescript
import { getActiveSub, ReactiveFlags } from '../src';

const src = signal(0);

effect(() => {
  // Remove RecursedCheck flag to allow recursion
  getActiveSub()!.flags &= ~ReactiveFlags.RecursedCheck;
  
  src.set(Math.min(src.get() + 1, 5));
});
// Executes 6 times: 0 → 1 → 2 → 3 → 4 → 5
```

**Warning**: Use sparingly - can cause infinite loops if not bounded

## EffectScope API

### Scope Management

#### Basic Scope
```typescript
const count = signal(0);

const stopScope = effectScope(() => {
  effect(() => {
    console.log('Effect 1:', count.get());
  });
  
  effect(() => {
    console.log('Effect 2:', count.get());
  });
});

count.set(1);  // Both effects execute

// Cleanup all effects at once
stopScope();
```

#### Nested Scopes
```typescript
const outerScope = effectScope(() => {
  const innerScope = effectScope(() => {
    effect(() => { /* inner */ });
  });
  
  effect(() => { /* outer */ });
});

// Stopping outer stops all inner scopes
outerScope();
```

**Best Practice**: Use scopes for component lifecycle management

## Trigger API

### Manual Propagation

#### For Array Mutations
```typescript
const arr = signal<number[]>([]);
const length = computed(() => arr.get().length);

arr.get().push(1);  // Internal mutation
trigger(arr);        // Manual propagation
console.log(length.get()); // 1
```

#### For Function Dependencies
```typescript
const src1 = signal<number[]>([]);
const src2 = signal<number[]>([]);

trigger(() => {
  src1.get();
  src2.get();
});
```

#### No-op Trigger
```typescript
// Valid: triggers with no dependencies
trigger(() => { });
```

## Utility Functions

### Type Guards

#### isSignal
```typescript
import { isSignal, signal } from '../src';

const sig = signal(0);
console.log(isSignal(sig));    // true
console.log(isSignal(123));    // false
```

#### isComputed
```typescript
import { isComputed, computed } from '../src';

const comp = computed(() => 0);
console.log(isComputed(comp)); // true
console.log(isComputed(123));  // false
```

#### isEffect
```typescript
import { isEffect, effect } from '../src';

const stop = effect(() => {});
console.log(isEffect(stop));   // true
console.log(isEffect(() => {})); // false
```

### Context Control

#### getActiveSub / setActiveSub
```typescript
import { getActiveSub, setActiveSub, signal } from '../src';

const src = signal(0);

// Save current subscriber
const currentSub = setActiveSub(undefined);

// Access signal without tracking
const value = src.get();

// Restore previous subscriber
setActiveSub(currentSub);
```

#### getCurrentScope / setCurrentScope
```typescript
import { getCurrentScope, effectScope } from '../src';

const scope = effectScope(() => {
  const current = getCurrentScope();
  console.log('Current scope:', current);
});
```

### Batch Operations

#### startBatch / endBatch
```typescript
import { startBatch, endBatch, signal } from '../src';

const a = signal(0);
const b = signal(0);
const c = signal(0);

startBatch();
a.set(1);
b.set(2);
c.set(3);
endBatch(); // Single unified propagation
```

#### getBatchDepth
```typescript
import { getBatchDepth, startBatch, endBatch } from '../src';

console.log(getBatchDepth()); // 0

startBatch();
console.log(getBatchDepth()); // 1

startBatch();
console.log(getBatchDepth()); // 2

endBatch();
endBatch();
```

## Advanced Patterns

### Custom Reactive System

#### createReactiveSystem
```typescript
import { createReactiveSystem } from './system';

const system = createReactiveSystem({
  update(node) {
    // Custom update logic
    return true;
  },
  notify(effect) {
    // Custom notification logic
  },
  unwatched(node) {
    // Callback when no longer watched
  }
});
```

### Performance Monitoring

#### Check Dependencies
```typescript
import { getActiveSub, effect, signal } from '../src';

const src = signal(0);

effect(() => {
  const sub = getActiveSub();
  console.log('Dependencies:', sub?.deps);
  console.log('Subscribers:', sub?.subs);
  
  src.get();
});
```

#### Force Flush
```typescript
import { endBatch, getBatchDepth } from '../src';

// Force immediate flush of pending updates
if (getBatchDepth() > 0) {
  endBatch();
}
```

## Best Practices

### 1. Choose Right API

```typescript
// Simple state → signal
const count = signal(0);

// Derived state → computed
const double = computed(() => count.get() * 2);

// Side effects → effect
effect(() => {
  console.log(count.get());
});

// Multiple effects → effectScope
const scope = effectScope(() => {
  effect(() => {});
  effect(() => {});
});
```

### 2. Prevent Memory Leaks

```typescript
// ✅ Always cleanup effects
const stop = effect(() => {
  // logic
});

onUnmounted(() => {
  stop();
});

// ✅ Use effectScope for batch management
const scope = effectScope(() => {
  effect(() => {});
  effect(() => {});
});

scope(); // One-time cleanup
```

### 3. Optimize Performance

```typescript
// ✅ Batch updates
startBatch();
for (let i = 0; i < 100; i++) {
  signals[i].set(i);
}
endBatch();

// ✅ Avoid unnecessary computation
const expensive = computed(() => {
  if (!condition.get()) {
    return defaultValue; // No dependencies
  }
  return expensiveComputation(data.get());
});
```

### 4. Handle Reference Types Correctly

```typescript
// ✅ Immutable updates
const user = signal({ name: 'John' });
user.set({ ...user.get(), name: 'Jane' });

// ✅ Array updates
const items = signal<Item[]>([]);
items.set([...items.get(), newItem]);

// ✅ Use trigger when necessary
const matrix = signal<number[][]>([]);
matrix.get()[0][0] = 1;
trigger(matrix);
```

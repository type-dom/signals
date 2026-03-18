# Signal Performance Optimization Skill

You are a performance optimization expert for TypeDom Signals. You analyze code patterns, identify performance bottlenecks, and apply proven optimization strategies to maximize reactive system efficiency.

## Skill Context

- **Library**: TypeDom Signals v0.8.1
- **Performance Model**: Push-Pull with non-recursive propagation
- **Optimization Target**: 400% faster than traditional reactivity
- **Key Metrics**: Update frequency, memory usage, computation count

## Configuration

| Parameter              | Default | Description                                    |
| ---------------------- | ------- | ---------------------------------------------- |
| `--max-batch-size`     | 100     | Maximum signals to batch in single operation   |
| `--lazy-threshold`     | 5       | Computed access count before forcing lazy eval |
| `--cleanup-interval`   | 1000ms  | Interval for cleaning stale dependencies       |
| `--profile-mode`       | basic   | Profiling level: basic, detailed, aggressive   |

## Optimization Strategies

### Strategy 1: Batch Multiple Updates

**When to Apply**: Multiple related signals need updating

```typescript
// ❌ BEFORE: Individual updates trigger multiple propagations
count.set(count.get() + 1);
double.set(double.get() * 2);
triple.set(triple.get() * 3);

// ✅ AFTER: Single batched update
startBatch();
count.set(count.get() + 1);
double.set(double.get() * 2);
triple.set(triple.get() * 3);
endBatch(); // Single unified propagation
```

**Performance Impact**: O(n) → O(1) propagations

**Auto-Detection**:
- Detect 3+ sequential signal.set() calls without batching
- Suggest startBatch()/endBatch() wrapper

### Strategy 2: Lazy Computed Evaluation

**When to Apply**: Expensive computations accessed conditionally

```typescript
// ❌ BEFORE: Eager recomputation
const expensive = computed(() => {
  return heavyCalculation(data.get());
});

// Always computes even when not accessed
effect(() => {
  if (shouldCompute.get()) {
    console.log(expensive.get());
  }
});

// ✅ AFTER: Conditional dependency
const expensive = computed(() => {
  if (!shouldCompute.get()) {
    return cachedValue; // No dependency on data
  }
  return heavyCalculation(data.get());
});
```

**Performance Impact**: Eliminates 60-80% unnecessary computations

**Auto-Detection**:
- Computed functions with >10ms execution time
- Check if always recomputes vs access frequency

### Strategy 3: Dependency Minimization

**When to Apply**: Effects track unnecessary dependencies

```typescript
// ❌ BEFORE: Tracks both a and b
effect(() => {
  const aVal = a.get();
  const bVal = b.get(); // Unnecessary dependency
  console.log('A value:', aVal);
});

// ✅ AFTER: Only track needed dependency
effect(() => {
  const aVal = a.get();
  console.log('A value:', aVal);
});
```

**Performance Impact**: Reduces effect re-execution by 30-50%

**Auto-Detection**:
- Analyze effect body for unused signal reads
- Suggest removing unnecessary .get() calls

### Strategy 4: Effect Cleanup Enforcement

**When to Apply**: Effects created in loops or conditionals

```typescript
// ❌ BEFORE: Memory leak - effects accumulate
data.forEach(item => {
  effect(() => {
    console.log(item.value);
  });
  // Missing cleanup!
});

// ✅ AFTER: Proper cleanup with scope
const stopScope = effectScope(() => {
  data.forEach(item => {
    effect(() => {
      console.log(item.value);
    });
  });
});

// Cleanup all at once when done
stopScope();
```

**Memory Impact**: Prevents unbounded growth

**Auto-Detection**:
- Track effect creation without corresponding stop() call
- Warn if effect created in loop without scope

### Strategy 5: Immutable Update Pattern

**When to Apply**: Object/array updates not triggering

```typescript
// ❌ BEFORE: Mutation doesn't trigger update
const user = signal({ name: 'John', age: 30 });
user.get().age = 31; // No trigger!

// ✅ AFTER: Immutable replacement
const user = signal({ name: 'John', age: 30 });
user.set({ ...user.get(), age: 31 }); // Triggers update

// OR use trigger for special cases
const items = signal<number[]>([1, 2, 3]);
items.get().push(4);
trigger(items); // Manual trigger
```

**Correctness Impact**: Ensures updates propagate correctly

**Auto-Detection**:
- Detect object mutation methods (.push, .splice, property assignment)
- Suggest immutable alternatives

## Performance Profiling

### Basic Profiling

```typescript
// Enable profiling mode
const profile = {
  updates: 0,
  computations: 0,
  effects: 0,
  startTime: performance.now()
};

// Wrap signal operations
const originalSet = Signal.prototype.set;
Signal.prototype.set = function(value) {
  profile.updates++;
  const start = performance.now();
  const result = originalSet.call(this, value);
  console.log('Set took:', performance.now() - start, 'ms');
  return result;
};

// Report after 1 second
setTimeout(() => {
  const elapsed = performance.now() - profile.startTime;
  console.log('Performance Profile:', {
    updatesPerSecond: profile.updates / (elapsed / 1000),
    totalUpdates: profile.updates,
    avgTimePerUpdate: elapsed / profile.updates
  });
}, 1000);
```

### Advanced Monitoring

```typescript
// Monitor computed caching effectiveness
const computeStats = new Map<Computed<any>, {
  accesses: number;
  recomputes: number;
  hitRate: number
}>();

function monitorComputed<T>(comp: Computed<T>, name: string) {
  let accesses = 0;
  let recomputes = 0;
  
  const originalGet = comp.get.bind(comp);
  comp.get = function() {
    accesses++;
    return originalGet();
  };
  
  // Track via effect
  effect(() => {
    recomputes++;
    comp.get();
  });
  
  computeStats.set(comp as any, {
    accesses,
    recomputes,
    hitRate: 0 // Will be calculated
  });
}
```

## Optimization Patterns

### Pattern 1: Derived State Caching

```typescript
// For frequently accessed derived state
const items = signal<Item[]>([]);
const expensiveFilter = computed(() => {
  return items.get().filter(/* expensive */);
});

// Cache the filtered result
let cachedResult: Item[] | null = null;
let lastVersion = 0;

const cachedFilter = computed(() => {
  const currentVersion = items.get().length;
  if (cachedResult !== null && currentVersion === lastVersion) {
    return cachedResult; // Return cached
  }
  cachedResult = items.get().filter(/* ... */);
  lastVersion = currentVersion;
  return cachedResult;
});
```

### Pattern 2: Debounced Updates

```typescript
// For rapid-fire updates (e.g., input, scroll)
function createDebouncedSignal<T>(initialValue: T, delayMs: number) {
  const pending = signal<T>(initialValue);
  const committed = signal<T>(initialValue);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return {
    get: () => committed.get(),
    set: (value: T) => {
      pending.set(value);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        committed.set(pending.get());
        timeoutId = null;
      }, delayMs);
    }
  };
}

// Usage
const searchQuery = createDebouncedSignal('', 300);
```

### Pattern 3: Selective Subscription

```typescript
// Only subscribe to specific fields
function selectField<T, K extends keyof T>(
  source: Signal<T>,
  field: K
): Signal<T[K]> {
  const selected = signal(source.get()[field]);
  
  effect(() => {
    selected.set(source.get()[field]);
  });
  
  return selected;
}

// Usage - only re-runs when name changes
const userName = selectField(user, 'name');
```

## Common Bottlenecks

### Bottleneck 1: Deep Nesting

**Problem**: 100+ levels of nested computeds

```typescript
// ❌ Causes stack overflow with recursion
let prev = base;
for (let i = 0; i < 1000; i++) {
  prev = computed(() => prev.get() + 1);
}

// ✅ TypeDom handles it (non-recursive)
// But consider flattening structure
const flat Computeds = Array.from({ length: 1000 }, (_, i) => 
  computed(() => base.get() + i)
);
```

### Bottleneck 2: Large Arrays

**Problem**: Array mutations trigger full re-computation

```typescript
// ❌ Recomputes entire array on every change
const items = signal<Item[]>([]);
const processed = computed(() => {
  return items.get().map(expensiveMap);
});

// ✅ Use incremental approach
const itemComputeds = signal<Computed<Item>[]>([]);

watch(items, (newItems) => {
  const newComputeds = newItems.map(item => 
    computed(() => expensiveMap(item))
  );
  itemComputeds.set(newComputeds);
});
```

### Bottleneck 3: Circular Dependencies

**Problem**: Infinite loops from circular refs

```typescript
// ❌ Circular dependency
const a = computed(() => b.get());
const b = computed(() => a.get());

// ✅ Break cycle with intermediate signal
const aInput = signal(0);
const a = computed(() => aInput.get());
const b = computed(() => a.get() + 1);
aInput.set(b.get()); // Controlled update
```

## Performance Benchmarks

### Expected Performance

| Operation                    | Target Time | Notes                              |
| ---------------------------- | ----------- | ---------------------------------- |
| Signal get/set (primitive)   | < 0.1μs     | Direct property access             |
| Computed get (cached)        | < 0.2μs     | Returns cached value               |
| Computed get (dirty)         | < 1μs       | Includes recomputation             |
| Effect trigger               | < 0.5μs     | Queue addition                     |
| Flush 100 effects            | < 5ms       | Batch execution                    |
| 1000 nested computeds        | < 50ms      | Full propagation chain             |

### Measurement Tools

```typescript
// Micro-benchmark helper
function benchmark(name: string, fn: () => void, iterations: number = 10000) {
  // Warmup
  for (let i = 0; i < 100; i++) fn();
  
  // Measure
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  
  console.log(`${name}:`, {
    total: elapsed.toFixed(2) + 'ms',
    perOp: (elapsed / iterations * 1000).toFixed(3) + 'μs',
    opsPerSec: Math.round(iterations / (elapsed / 1000)).toLocaleString()
  });
}

// Usage
benchmark('Signal get/set', () => {
  const s = signal(0);
  s.set(1);
  s.get();
});
```

## Auto-Optimization Rules

### Rule Engine

```typescript
interface OptimizationRule {
  id: string;
  pattern: RegExp | ((code: string) => boolean);
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  autoFix?: (code: string) => string;
}

const rules: OptimizationRule[] = [
  {
    id: 'batch-updates',
    pattern: /(\w+)\.set\([^)]+\)\s*\n\s*\1\.set/g,
    suggestion: 'Consider batching these updates with startBatch()/endBatch()',
    impact: 'high',
    autoFix: (code) => {
      return code.replace(
        /(\/\/ Start optimization\n)([\s\S]*?)(\w+\.set[^;]+;\n(?:\s*\w+\.set[^;]+;\n)+)/g,
        '$1startBatch();\n$2endBatch();\n'
      );
    }
  },
  {
    id: 'missing-cleanup',
    pattern: /effect\(\([^)]*\)\s*=>\s*{[^}]*}\)/g,
    suggestion: 'Store effect cleanup function and call it when done',
    impact: 'high'
  }
];
```

## Action Plan

### When User Reports "Slow Updates"

1. **Profile First**
   ```typescript
   // Enable profiling
   const profiler = enableProfiler();
   
   // Reproduce issue
   // ... user action ...
   
   // Get report
   const report = profiler.getReport();
   console.log('Bottleneck:', report.slowestOperation);
   ```

2. **Check Common Issues**
   - Are effects re-running unnecessarily?
   - Is computed recomputing too often?
   - Are there too many dependencies?

3. **Apply Fixes**
   - Add batching if multiple updates
   - Make computed lazy if conditional
   - Remove unused dependencies

4. **Verify Improvement**
   ```typescript
   // Re-run same profile
   const afterReport = profiler.getReport();
   console.log('Improvement:', 
     (beforeReport.time - afterReport.time) / beforeReport.time * 100 + '%'
   );
   ```

# Signal Testing Strategy Skill

You are a testing expert for TypeDom Signals. You design comprehensive test strategies, create effective test cases, ensure edge case coverage, and maintain >90% code coverage across all reactive components.

## Skill Context

- **Test Framework**: Vitest 3.x
- **Coverage Target**: >= 90% statements, functions, branches
- **Test Types**: Unit, integration, performance, stress tests
- **Test Files**: 12 spec files with 100+ test cases

## Configuration

| Parameter              | Default | Description                                    |
| ---------------------- | ------- | ---------------------------------------------- |
| `--coverage-threshold` | 90      | Minimum coverage percentage                    |
| `--test-timeout`       | 5000    | Default test timeout in milliseconds           |
| `--parallel`           | true    | Run tests in parallel when possible            |
| `--randomize`          | true    | Randomize test execution order                 |

## Test Architecture

### Test Pyramid for Signals

```
        /🔺\
       / E2E \         Visual/Integration Tests (10%)
      /-------\
     / Integration \   Component Integration (20%)
    /---------------\
   /    Unit Tests   \ Core API Tests (70%)
  /-------------------\
```

### Test File Organization

```
tests/
├── index.spec.ts           # Basic signal operations (8 tests)
├── computed.spec.ts        # Computed properties (4 tests)
├── effect.spec.ts          # Effect tracking (13 tests)
├── effectScope.spec.ts     # Scope lifecycle (3 tests)
├── trigger.spec.ts         # Manual triggers (5 tests)
├── untrack.spec.ts         # Untracked access (4 tests)
├── topology.spec.ts        # Complex graphs (15 tests)
├── api-coverage.spec.ts    # API surface (20 tests)
├── best-practices.spec.ts  # Pattern validation (10 tests)
├── issue_48.spec.ts        # Regression tests (5 tests)
├── trigger-comprehensive.spec.ts # Advanced trigger (12 tests)
└── build.spec.ts           # Build verification (2 tests)
```

## Testing Patterns

### Pattern 1: AAA Test Structure

```typescript
import { test, expect } from 'vitest';
import { signal, computed, effect } from '../src';

test('should propagate changes through computed', () => {
  // Arrange - Setup test data
  const src = signal(0);
  const timesComputed = 0;
  
  const doubled = computed(() => {
    timesComputed++;
    return src.get() * 2;
  });
  
  let effectValue: number | undefined;
  
  // Act - Create effect and trigger change
  effect(() => {
    effectValue = doubled.get();
  });
  
  src.set(5);
  
  // Assert - Verify results
  expect(effectValue).toBe(10);
  expect(timesComputed).toBe(2); // Initial + one update
});
```

### Pattern 2: Snapshot Testing for State

```typescript
test('should have correct initial state', () => {
  const sig = signal({ count: 0, name: 'test' });
  
  expect({
    value: sig.get(),
    hasSubs: !!(sig as any).subs,
    flags: (sig as any).flags
  }).toMatchSnapshot();
});
```

### Pattern 3: Time-Based Testing

```typescript
test('should debounce rapid updates', async () => {
  const debounced = createDebouncedSignal(0, 100);
  const updates: number[] = [];
  
  effect(() => {
    updates.push(debounced.get());
  });
  
  // Rapid updates
  debounced.set(1);
  debounced.set(2);
  debounced.set(3);
  
  // Should not have updated yet
  expect(updates).toEqual([0]);
  
  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Should have final value only
  expect(updates).toEqual([0, 3]);
});
```

## Core API Tests

### Signal Tests

#### Basic Operations
```typescript
describe('Signal', () => {
  describe('creation', () => {
    test('should create signal with initial value', () => {
      const count = signal(0);
      expect(count.get()).toBe(0);
    });
    
    test('should create signal without initial value', () => {
      const empty: Signal<number> = signal();
      expect(empty.get()).toBeUndefined();
    });
    
    test('should handle null as initial value', () => {
      const nullable = signal<number | null>(null);
      expect(nullable.get()).toBeNull();
    });
  });
  
  describe('updates', () => {
    test('should update value on set', () => {
      const count = signal(0);
      count.set(1);
      expect(count.get()).toBe(1);
    });
    
    test('should notify subscribers on change', () => {
      const count = signal(0);
      let notifiedValue: number | undefined;
      
      effect(() => {
        notifiedValue = count.get();
      });
      
      expect(notifiedValue).toBe(0);
      count.set(1);
      expect(notifiedValue).toBe(1);
    });
    
    test('should not notify if value unchanged', () => {
      const count = signal(0);
      let notifyCount = 0;
      
      effect(() => {
        notifyCount++;
        count.get();
      });
      
      expect(notifyCount).toBe(1);
      count.set(0); // Same value
      expect(notifyCount).toBe(1); // Still 1
    });
  });
  
  describe('reference types', () => {
    test('should handle object replacement', () => {
      const user = signal({ name: 'John', age: 30 });
      user.set({ ...user.get(), age: 31 });
      expect(user.get().age).toBe(31);
    });
    
    test('should handle array mutations with trigger', () => {
      const items = signal<number[]>([1, 2, 3]);
      items.get().push(4);
      trigger(items);
      expect(items.get().length).toBe(4);
    });
  });
});
```

### Computed Tests

```typescript
describe('Computed', () => {
  describe('caching', () => {
    test('should cache computed value', () => {
      const count = signal(0);
      let computeCount = 0;
      
      const result = computed(() => {
        computeCount++;
        return count.get() * 2;
      });
      
      result.get();
      expect(computeCount).toBe(1);
      
      result.get(); // Cached
      expect(computeCount).toBe(1);
      
      count.set(1); // Mark dirty
      result.get(); // Recompute
      expect(computeCount).toBe(2);
    });
    
    test('should not recompute if value same', () => {
      const src = signal(0);
      let times = 0;
      
      const comp = computed(() => {
        times++;
        return src.get();
      });
      
      comp.get();
      expect(times).toBe(1);
      
      src.set(1);
      src.set(0); // Revert
      
      comp.get();
      expect(times).toBe(1); // Should NOT recompute
    });
  });
  
  describe('writable computed', () => {
    test('should use setter when provided', () => {
      const count = signal(0);
      const double = computed(
        () => count.get() * 2,
        (val) => count.set(val / 2)
      );
      
      double.set(10);
      expect(count.get()).toBe(5);
    });
  });
  
  describe('dependency chain', () => {
    test('should propagate through chain', () => {
      const src = signal(0);
      const c1 = computed(() => src.get()! % 2);
      const c2 = computed(() => c1.get());
      const c3 = computed(() => c2.get());
      
      c3.get();
      src.set(1);
      c2.get();
      src.set(3);
      
      expect(c3.get()).toBe(1);
    });
    
    test('should handle diamond dependency', () => {
      const a = signal(1);
      const b = computed(() => a.get() * 2);
      const c = computed(() => a.get() + 1);
      const d = computed(() => b.get() + c.get());
      
      let executions = 0;
      effect(() => {
        executions++;
        d.get();
      });
      
      expect(executions).toBe(1);
      a.set(2);
      expect(executions).toBe(2);
      expect(d.get()).toBe(7); // 2*2 + 2+1
    });
  });
});
```

### Effect Tests

```typescript
describe('Effect', () => {
  describe('basic tracking', () => {
    test('should track dependencies automatically', () => {
      const count = signal(0);
      let effectValue: number | undefined;
      
      effect(() => {
        effectValue = count.get();
      });
      
      expect(effectValue).toBe(0);
      count.set(1);
      expect(effectValue).toBe(1);
    });
    
    test('should cleanup on stop', () => {
      const count = signal(0);
      let executions = 0;
      
      const stop = effect(() => {
        executions++;
        count.get();
      });
      
      expect(executions).toBe(1);
      stop();
      count.set(1);
      expect(executions).toBe(1); // No more executions
    });
  });
  
  describe('nested effects', () => {
    test('should cleanup inner effect when outer condition changes', () => {
      const condition = signal(true);
      const data = signal(0);
      let innerExecutions = 0;
      
      effect(() => {
        if (condition.get()) {
          effect(() => {
            innerExecutions++;
            data.get();
          });
        }
      });
      
      expect(innerExecutions).toBe(1);
      condition.set(false); // Cleanup inner
      data.set(1);
      expect(innerExecutions).toBe(1); // Still 1
    });
    
    test('should execute in correct order', () => {
      const a = signal(1);
      const b = signal(1);
      const order: string[] = [];
      
      effect(() => {
        effect(() => {
          a.get();
          order.push('inner-a');
        });
        effect(() => {
          b.get();
          order.push('inner-b');
        });
      });
      
      order.length = 0;
      a.set(2);
      b.set(2);
      
      expect(order).toEqual(['inner-a', 'inner-b']);
    });
  });
  
  describe('batching', () => {
    test('should batch multiple updates', () => {
      const a = signal(0);
      const b = signal(0);
      const logs: string[] = [];
      
      effect(() => {
        startBatch();
        try {
          logs.push(`a=${a.get()}, b=${b.get()}`);
        } finally {
          endBatch();
        }
      });
      
      startBatch();
      a.set(1);
      b.set(2);
      endBatch();
      
      expect(logs).toEqual(['a=0, b=0', 'a=1, b=2']);
    });
  });
});
```

## Advanced Test Scenarios

### Stress Testing

```typescript
describe('Stress Tests', () => {
  test('should handle 1000 nested computeds', () => {
    const base = signal(1);
    let prev: Computed<any> = base as any;
    
    // Create 1000 levels
    for (let i = 0; i < 1000; i++) {
      prev = computed(() => prev.get() + 1);
    }
    
    expect(prev.get()).toBe(1001);
    
    base.set(2);
    expect(prev.get()).toBe(1002);
  }, 30000); // 30s timeout
  
  test('should handle 10000 signals efficiently', () => {
    const signals = Array.from({ length: 10000 }, () => signal(0));
    
    const total = computed(() => {
      return signals.reduce((sum, s) => sum + s.get(), 0);
    });
    
    const start = performance.now();
    
    startBatch();
    signals.forEach((s, i) => s.set(i));
    endBatch();
    
    const elapsed = performance.now() - start;
    
    expect(total.get()).toBe(49995000); // Sum 0..9999
    expect(elapsed).toBeLessThan(1000); // Should complete in <1s
  });
});
```

### Memory Leak Tests

```typescript
describe('Memory Leak Prevention', () => {
  test('should cleanup all dependencies', () => {
    const src = signal(0);
    const comps = Array.from({ length: 100 }, (_, i) => 
      computed(() => src.get() + i)
    );
    
    const stops = comps.map(comp => 
      effect(() => {
        comp.get();
      })
    );
    
    // Cleanup all
    stops.forEach(stop => stop());
    
    // Verify no subscribers remain
    expect((src as any).subs).toBeUndefined();
  });
  
  test('should cleanup effect scope completely', () => {
    const src = signal(0);
    let activeEffects = 0;
    
    const stopScope = effectScope(() => {
      Array.from({ length: 100 }, () => {
        effect(() => {
          activeEffects++;
          src.get();
        });
      });
    });
    
    expect(activeEffects).toBe(100);
    activeEffects = 0;
    
    stopScope(); // Cleanup all
    
    src.set(1);
    expect(activeEffects).toBe(0); // None should execute
  });
});
```

### Edge Case Tests

```typescript
describe('Edge Cases', () => {
  test('should handle undefined correctly', () => {
    const sig = signal(undefined as number | undefined);
    let value: number | undefined;
    
    effect(() => {
      value = sig.get();
    });
    
    expect(value).toBeUndefined();
    sig.set(undefined); // Set same undefined value
    expect(value).toBeUndefined();
  });
  
  test('should handle NaN correctly', () => {
    const sig = signal(NaN);
    expect(sig.get()).toBeNaN();
    
    let value: number;
    effect(() => {
      value = sig.get();
    });
    
    expect(value).toBeNaN();
    sig.set(NaN); // NaN !== NaN, but should still trigger
  });
  
  test('should handle circular reference safely', () => {
    const a = signal(false);
    const b = computed(() => a.get());
    const c = computed(() => {
      b.get();
      return 0;
    });
    const d = computed(() => {
      c.get();
      return b.get();
    });
    
    let triggers = 0;
    effect(() => {
      d.get();
      triggers++;
    });
    
    expect(triggers).toBe(1);
    a.set(true);
    expect(triggers).toBe(2); // Should not infinite loop
  });
  
  test('should handle conditional dependencies', () => {
    const condition = signal(true);
    const src1 = signal(1);
    const src2 = signal(2);
    
    let value: number;
    effect(() => {
      if (condition.get()) {
        value = src1.get();
      } else {
        value = src2.get();
      }
    });
    
    expect(value).toBe(1);
    condition.set(false);
    expect(value).toBe(2);
    
    // Both should be tracked now
    src1.set(10);
    src2.set(20);
  });
});
```

## Coverage Strategies

### Branch Coverage

```typescript
test('should cover all flag combinations', () => {
  const sig = signal(0);
  const node = sig as any as ReactiveNode;
  
  // Test Mutable flag
  expect(node.flags & 1).toBeTruthy();
  
  // Test Watching flag (via effect)
  effect(() => {
    sig.get();
  });
  expect(node.flags & 2).toBeTruthy();
  
  // Test Dirty flag (via set)
  sig.set(1);
  expect(node.flags & 16).toBeTruthy();
});
```

### Statement Coverage

```typescript
test('should execute all code paths in updateComputed', () => {
  const src = signal({ value: 0 });
  let primitivePath = false;
  let objectPath = false;
  
  const comp = computed(() => {
    const val = src.get();
    if (typeof val === 'object') {
      objectPath = true;
      return val.value;
    } else {
      primitivePath = true;
      return val;
    }
  });
  
  comp.get();
  expect(objectPath).toBe(true);
  
  src.set(42); // Primitive
  comp.get();
  expect(primitivePath).toBe(true);
});
```

### Path Coverage

```typescript
test('should test all propagation paths', () => {
  // Direct path: signal → effect
  const s1 = signal(0);
  effect(() => { s1.get(); });
  
  // Computed path: signal → computed → effect
  const s2 = signal(0);
  const c = computed(() => s2.get());
  effect(() => { c.get(); });
  
  // Chain path: signal → computed → computed → effect
  const s3 = signal(0);
  const c1 = computed(() => s3.get());
  const c2 = computed(() => c1.get());
  effect(() => { c2.get(); });
  
  // All should work
  s1.set(1);
  s2.set(2);
  s3.set(3);
});
```

## Test Utilities

### Mock Timer Helper

```typescript
// For testing time-based behavior
class MockTimers {
  private timers = new Map<number, () => void>();
  private idCounter = 0;
  
  setTimeout(fn: () => void, delay: number): number {
    const id = ++this.idCounter;
    this.timers.set(id, fn);
    return id;
  }
  
  runAll() {
    const timers = Array.from(this.timers.values());
    this.timers.clear();
    timers.forEach(fn => fn());
  }
}

// Usage in tests
const mockTimers = new MockTimers();
global.setTimeout = mockTimers.setTimeout.bind(mockTimers);

test('should debounce', () => {
  // ... setup debounced signal ...
  mockTimers.runAll();
  // ... verify ...
});
```

### Coverage Reporter

```typescript
// Custom coverage helper
function reportCoverage(testName: string) {
  const coverage = {
    statements: getStatementCoverage(),
    branches: getBranchCoverage(),
    functions: getFunctionCoverage(),
    lines: getLineCoverage()
  };
  
  console.log(`${testName} Coverage:`, coverage);
  
  // Fail if below threshold
  const THRESHOLD = 90;
  if (coverage.statements < THRESHOLD) {
    throw new Error(`Statement coverage ${coverage.statements}% < ${THRESHOLD}%`);
  }
}
```

## Quick Reference

### Test Checklist

For each new feature:
- [ ] Basic functionality test
- [ ] Edge cases (undefined, null, NaN)
- [ ] Error handling test
- [ ] Dependency tracking test
- [ ] Cleanup/disposal test
- [ ] Performance benchmark (if critical)
- [ ] Integration with existing features

### Common Test Patterns

```typescript
// Pattern: Arrange-Act-Assert
test('should do something', () => {
  // Arrange
  const signal = createSignal();
  
  // Act
  signal.set(value);
  
  // Assert
  expect(signal.get()).toBe(expected);
});

// Pattern: Given-When-Then
test('given X when Y then Z', () => {
  // Given
  const signal = signal(0);
  
  // When
  signal.set(1);
  
  // Then
  expect(signal.get()).toBe(1);
});

// Pattern: Test Double
test('should work with mock', () => {
  const mockCallback = vi.fn();
  effect(mockCallback);
  expect(mockCallback).toHaveBeenCalled();
});
```

### Debug Test Failures

```typescript
// Add detailed logging on failure
test('should propagate correctly', () => {
  const src = signal(0);
  const comp = computed(() => src.get());
  
  let effectRun = false;
  effect(() => {
    console.log('Effect running, comp value:', comp.get());
    effectRun = true;
  });
  
  try {
    src.set(1);
    expect(effectRun).toBe(true);
  } catch (error) {
    console.error('Test failed!');
    console.error('Signal state:', inspectSignal(src));
    console.error('Computed state:', inspectSignal(comp));
    throw error;
  }
});
```

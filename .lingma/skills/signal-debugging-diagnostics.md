# Signal Debugging and Diagnostics Skill

You are a debugging expert for TypeDom Signals. You diagnose reactive system issues, trace dependency chains, identify memory leaks, and provide systematic solutions for complex problems.

## Skill Context

- **Debug Target**: TypeDom Signals reactive system
- **Common Issues**: Update failures, infinite loops, stale values, memory leaks
- **Debug Tools**: Console logging, state inspection, dependency visualization
- **Diagnostic Approach**: Systematic isolation and verification

## Configuration

| Parameter              | Default      | Description                                    |
| ---------------------- | ------------ | ---------------------------------------------- |
| `--log-level`          | info         | Verbosity: error, warn, info, debug, verbose   |
| `--trace-depth`        | 10           | Maximum dependency chain depth to trace        |
| `--break-on-error`     | true         | Pause execution on detected errors             |
| `--auto-inspect`       | true         | Automatically inspect suspicious patterns      |

## Diagnostic Framework

### Issue Classification Matrix

| Symptom                          | Likely Cause              | Priority | Diagnostic Step          |
| -------------------------------- | ------------------------- | -------- | ------------------------ |
| Effect doesn't re-run            | Missing dependency track  | High     | Check effect body        |
| Computed returns stale value     | Not marked dirty          | High     | Inspect flags            |
| Infinite loop                    | Circular dependency       | Critical | Trace dependency chain   |
| Memory growing unbounded         | Missing cleanup           | High     | Check effect disposal    |
| Update delayed                   | Batch not flushed         | Medium   | Check batchDepth         |
| Wrong update order               | Nested effect issue       | Medium   | Check execution queue    |

## Debugging Techniques

### Technique 1: Dependency Chain Visualization

```typescript
// Visualize entire dependency graph
function visualizeDependencies(node: ReactiveNode, indent = 0): string {
  const prefix = '  '.repeat(indent);
  let output = `${prefix}Node(flags=${node.flags})\n`;
  
  // Show dependencies
  if (node.deps) {
    output += `${prefix}  Dependencies:\n`;
    let dep = node.deps;
    do {
      output += visualizeDependencies(dep.dep, indent + 2);
      dep = dep.nextDep!;
    } while (dep && dep !== node.deps);
  }
  
  // Show subscribers
  if (node.subs) {
    output += `${prefix}  Subscribers:\n`;
    let sub = node.subs;
    do {
      output += visualizeDependencies(sub.sub, indent + 2);
      sub = sub.nextSub!;
    } while (sub && sub !== node.subs);
  }
  
  return output;
}

// Usage
const src = signal(0);
const comp = computed(() => src.get());
effect(() => {
  comp.get();
});

console.log(visualizeDependencies(src as any));
```

**Output Example**:
```
Node(flags=3)
  Dependencies:
    Node(flags=2)
      Subscribers:
        Node(flags=3)
          Dependencies:
            Node(flags=17)
```

### Technique 2: State Inspection Dashboard

```typescript
interface SignalState {
  type: 'signal' | 'computed' | 'effect';
  flags: {
    mutable: boolean;
    watching: boolean;
    dirty: boolean;
    pending: boolean;
  };
  depsCount: number;
  subsCount: number;
  lastValue?: any;
}

function inspectSignal<T>(sig: Signal<T> | Computed<T>): SignalState {
  const node = sig as any as ReactiveNode;
  
  return {
    type: sig instanceof Signal ? 'signal' : 'computed',
    flags: {
      mutable: !!(node.flags & 1),
      watching: !!(node.flags & 2),
      dirty: !!(node.flags & 16),
      pending: !!(node.flags & 32)
    },
    depsCount: countLinks(node.deps),
    subsCount: countLinks(node.subs),
    lastValue: (sig as any).currentValue || (sig as any).value
  };
}

function countLinks(link: Link | undefined): number {
  let count = 0;
  while (link) {
    count++;
    link = link.nextDep || link.nextSub;
    if (count > 1000) break; // Safety limit
  }
  return count;
}

// Usage
const s = signal(42);
console.table(inspectSignal(s));
```

### Technique 3: Execution Trace Logger

```typescript
// Add comprehensive logging
function enableDebugLogging() {
  const originalEffect = effect;
  effect = function(fn: () => void) {
    console.group('effect() called');
    console.trace();
    const stop = originalEffect(fn);
    console.groupEnd();
    return stop;
  };
  
  const originalSet = Signal.prototype.set;
  Signal.prototype.set = function(value: any) {
    console.group(`signal.set(${value})`);
    console.log('Previous value:', this.currentValue);
    console.log('Flags before:', this.flags);
    const result = originalSet.call(this, value);
    console.log('Flags after:', this.flags);
    console.groupEnd();
    return result;
  };
  
  const originalComputedGet = Computed.prototype.get;
  Computed.prototype.get = function() {
    console.group('computed.get()');
    console.log('Current flags:', this.flags);
    const result = originalComputedGet.call(this);
    console.log('Returned:', result);
    console.groupEnd();
    return result;
  };
}

// Enable in development
if (process.env.NODE_ENV === 'development') {
  enableDebugLogging();
}
```

### Technique 4: Memory Leak Detector

```typescript
class MemoryLeakDetector {
  private trackedEffects = new Map<() => void, {
    createdAt: string;
    callStack: string;
    cleanupCalled: boolean;
  }>();
  
  monitor(effectStop: () => void) {
    const stack = new Error().stack!;
    this.trackedEffects.set(effectStop, {
      createdAt: new Date().toISOString(),
      callStack: stack,
      cleanupCalled: false
    });
    
    // Wrap stop function
    const originalStop = effectStop;
    effectStop = () => {
      const info = this.trackedEffects.get(originalStop);
      if (info) {
        info.cleanupCalled = true;
      }
      originalStop();
    };
    
    return effectStop;
  }
  
  report() {
    const leaks = Array.from(this.trackedEffects.entries())
      .filter(([_, info]) => !info.cleanupCalled)
      .map(([stopFn, info]) => ({
        createdAt: info.createdAt,
        callStack: info.callStack.split('\n').slice(1, 6).join('\n')
      }));
    
    if (leaks.length > 0) {
      console.warn(`⚠️ Found ${leaks.length} potential memory leaks:`);
      console.table(leaks);
    } else {
      console.log('✅ No memory leaks detected');
    }
  }
}

// Usage
const detector = new MemoryLeakDetector();

// In component setup
const stopEffect = detector.monitor(effect(() => {
  data.get();
}));

// Later - check for leaks
detector.report();
```

## Common Issues and Solutions

### Issue 1: Effect Not Triggering

**Symptoms**:
```typescript
const data = signal(0);
effect(() => {
  console.log('Effect:', data.get());
});
data.set(1); // Effect should run but doesn't
```

**Diagnosis Steps**:

1. **Check if effect was cleaned up**
```typescript
const stop = effect(() => { ... });
// Did you call stop() accidentally?
```

2. **Verify dependency tracking**
```typescript
effect(() => {
  const d = data; // ❌ Just reference, no tracking
  console.log(d);
});

effect(() => {
  console.log(data.get()); // ✅ Access .get() for tracking
});
```

3. **Inspect flags**
```typescript
const node = data as any as ReactiveNode;
console.log('Flags:', node.flags);
// Should have Mutable flag (1)
```

**Solution**:
```typescript
// Ensure .get() is called inside effect
effect(() => {
  const value = data.get(); // Tracks dependency
  console.log('Effect:', value);
});
```

### Issue 2: Computed Returns Stale Value

**Symptoms**:
```typescript
const src = signal(0);
const comp = computed(() => src.get() * 2);
src.set(5);
console.log(comp.get()); // Expected 10, got 0
```

**Diagnosis**:

1. **Check if computed is marked dirty**
```typescript
const node = comp as any as ReactiveNode;
console.log('Dirty?', !!(node.flags & 16));
console.log('Pending?', !!(node.flags & 32));
```

2. **Verify source signal propagation**
```typescript
console.log('Source subs:', (src as any).subs);
// Should include computed in subscriber chain
```

3. **Force refresh**
```typescript
trigger(comp); // Manual trigger
console.log(comp.get()); // Should be updated now
```

**Solution**:
```typescript
// Ensure proper dependency chain
const src = signal(0);
const comp = computed(() => src.get() * 2);

// Create effect to keep computed alive
effect(() => {
  console.log(comp.get());
});

src.set(5); // Now propagates correctly
```

### Issue 3: Infinite Loop

**Symptoms**:
```typescript
const a = computed(() => b.get());
const b = computed(() => a.get());
// RangeError: Maximum call stack exceeded
```

**Diagnosis**:

1. **Detect circular dependency**
```typescript
function detectCircular(node: ReactiveNode, visited = new Set()): boolean {
  if (visited.has(node)) return true;
  visited.add(node);
  
  let dep = node.deps;
  while (dep) {
    if (detectCircular(dep.dep, new Set(visited))) {
      return true;
    }
    dep = dep.nextDep!;
  }
  return false;
}
```

2. **Break the cycle**
```typescript
// Use intermediate signal
const input = signal(0);
const a = computed(() => input.get());
const b = computed(() => a.get() + 1);

// Controlled update
input.set(b.get()); // Explicit, not automatic
```

**Solution**:
```typescript
// Redesign to avoid circular refs
const state = signal({ a: 0, b: 0 });

const a = computed(() => state.get().a);
const b = computed(() => state.get().b);

// Update both at once
state.set(prev => ({ a: b.get(), b: a.get() + 1 }));
```

### Issue 4: Memory Leak

**Symptoms**:
- Application slows over time
- Effects execute after component unmount
- Memory usage grows continuously

**Diagnosis**:

1. **Track effect lifecycle**
```typescript
class EffectTracker {
  activeEffects = new Set<() => void>();
  
  track(stop: () => void) {
    this.activeEffects.add(stop);
    
    // Auto-remove on cleanup
    const wrapped = () => {
      this.activeEffects.delete(stop);
      stop();
    };
    
    return wrapped;
  }
  
  report() {
    console.log(`Active effects: ${this.activeEffects.size}`);
  }
}
```

2. **Find unclosed effects**
```typescript
// In component
const tracker = new EffectTracker();

componentDidMount() {
  const stop = tracker.track(effect(() => {
    data.get();
  }));
}

componentWillUnmount() {
  // Should clean up all
  tracker.activeEffects.forEach(stop => stop());
  tracker.report(); // Should show 0
}
```

**Solution**:
```typescript
// Always use effectScope for components
class Component {
  private stopScope: (() => void) | null = null;
  
  mount() {
    this.stopScope = effectScope(() => {
      effect(() => { /* ... */ });
      effect(() => { /* ... */ });
    });
  }
  
  unmount() {
    if (this.stopScope) {
      this.stopScope(); // Cleans up all effects
      this.stopScope = null;
    }
  }
}
```

## Debug Tools

### Tool 1: Interactive Debugger

```typescript
class SignalDebugger {
  breakpoints = new Set<'set' | 'get' | 'effect' | 'computed'>();
  pauseOnBreakpoint = true;
  
  constructor() {
    this.installHooks();
  }
  
  setBreakpoint(type: 'set' | 'get' | 'effect' | 'computed') {
    this.breakpoints.add(type);
    console.log(`🔴 Breakpoint set on ${type}`);
  }
  
  private installHooks() {
    const self = this;
    
    // Hook into signal operations
    const originalSet = Signal.prototype.set;
    Signal.prototype.set = function(value: any) {
      if (self.breakpoints.has('set')) {
        console.log('⏸️ Breakpoint: signal.set()');
        console.log('This:', this);
        console.log('Value:', value);
        if (self.pauseOnBreakpoint) debugger;
      }
      return originalSet.call(this, value);
    };
    
    // Similar hooks for get, effect, computed...
  }
}

// Usage
const debug = new SignalDebugger();
debug.setBreakpoint('set');
```

### Tool 2: Performance Profiler

```typescript
interface ProfileReport {
  operation: string;
  count: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
}

class SignalProfiler {
  private timings = new Map<string, ProfileReport>();
  
  start() {
    this.installHooks();
  }
  
  private installHooks() {
    const self = this;
    
    const originalSet = Signal.prototype.set;
    Signal.prototype.set = function(value: any) {
      const start = performance.now();
      const result = originalSet.call(this, value);
      const elapsed = performance.now() - start;
      
      self.record('signal.set', elapsed);
      return result;
    };
    
    // Similar for other operations
  }
  
  private record(operation: string, time: number) {
    let report = this.timings.get(operation);
    if (!report) {
      report = { operation, count: 0, totalTime: 0, avgTime: 0, maxTime: 0 };
      this.timings.set(operation, report);
    }
    
    report.count++;
    report.totalTime += time;
    report.maxTime = Math.max(report.maxTime, time);
    report.avgTime = report.totalTime / report.count;
  }
  
  report() {
    console.log('=== Performance Profile ===');
    console.table(Array.from(this.timings.values()));
  }
}

// Usage
const profiler = new SignalProfiler();
profiler.start();

// ... run your code ...

profiler.report();
```

### Tool 3: Dependency Graph Visualizer (Mermaid)

```typescript
function generateMermaidGraph(node: ReactiveNode, id = 0): string {
  const nodeId = `node${id}`;
  const nodeType = node instanceof Signal ? 'Signal' : 
                   node instanceof Computed ? 'Computed' : 'Effect';
  
  let graph = `${nodeId}[${nodeType}]`;
  
  // Add dependencies
  if (node.deps) {
    let dep = node.deps;
    do {
      graph += `\n  ${nodeId} --> dep${id}_${dep.dep}`;
      dep = dep.nextDep!;
    } while (dep);
  }
  
  // Add subscribers
  if (node.subs) {
    let sub = node.subs;
    do {
      graph += `\n  ${nodeId} --> sub${id}_${sub.sub}`;
      sub = sub.nextSub!;
    } while (sub);
  }
  
  return graph;
}

// Usage - generates Mermaid diagram syntax
const src = signal(0);
const comp = computed(() => src.get());
effect(() => comp.get());

console.log(generateMermaidGraph(src as any));
/*
graph TD
  node0[Signal]
  node0 --> dep0_1
  node0 --> sub0_2
*/
```

## Quick Reference

### Flag Values

| Flag Name       | Value | Binary  | Meaning                        |
| --------------- | ----- | ------- | ------------------------------ |
| Mutable         | 1     | 000001  | Can propagate changes          |
| Watching        | 2     | 000010  | Has active watchers            |
| RecursedCheck   | 4     | 000100  | Currently checking recursion   |
| Recursed        | 8     | 001000  | Has recursed                   |
| Dirty           | 16    | 010000  | Needs recomputation            |
| Pending         | 32    | 100000  | Propagation pending            |

### Common Flag Combinations

- `0` - Inactive/Cleaned up
- `1` (Mutable) - Plain signal, ready
- `3` (Mutable + Watching) - Signal with effect
- `17` (Mutable + Dirty) - Signal changed, not propagated
- `19` (Mutable + Dirty + Watching) - Changed with watcher
- `48` (Recursed + Pending) - Complex dependency chain

### Emergency Recovery

```typescript
// Force flush everything
while (getBatchDepth() > 0) {
  endBatch();
}

// Reset corrupted signal
function resetSignal<T>(sig: Signal<T>, initialValue: T) {
  sig.pendingValue = initialValue;
  sig.currentValue = initialValue;
  sig.flags = 1; // Mutable only
  trigger(sig);
}

// Clean all effects in scope
function nukeScope(scope: ReactiveNode) {
  scope.depsTail = undefined;
  scope.flags = 0;
  purgeDeps(scope);
  if (scope.subs) {
    unlink(scope.subs);
  }
}
```

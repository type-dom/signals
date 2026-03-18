# Signal Integration Patterns Skill

You are an integration expert for TypeDom Signals. You help developers integrate signals into various frameworks, combine with other libraries, migrate from existing state management solutions, and build custom reactive systems.

## Skill Context

- **Integration Targets**: Components, stores, forms, routing, APIs
- **Migration Paths**: From Vuex, Redux, MobX, RxJS
- **Custom Systems**: Build your own signal-based architecture
- **Interoperability**: Work alongside existing patterns

## Configuration

| Parameter              | Default       | Description                                    |
| ---------------------- | ------------- | ---------------------------------------------- |
| `--migration-mode`     | gradual       | Migration strategy: gradual, big-bang, hybrid  |
| `--adapter-pattern`    | facade        | Integration pattern: facade, wrapper, proxy    |
| `--compatibility`      | lenient       | Compatibility mode: strict, lenient, auto      |

## Framework Integration

### Pattern 1: Component Integration (Vue-like)

```typescript
// Base component class
class ReactiveComponent {
  protected stopScope?: () => void;
  
  setup() {
    this.stopScope = effectScope(() => {
      this.template();
    });
  }
  
  template() {
    // Override in subclass
  }
  
  render() {
    // Triggered by effects automatically
  }
  
  dispose() {
    if (this.stopScope) {
      this.stopScope();
    }
  }
}

// Usage
class Counter extends ReactiveComponent {
  private count = signal(0);
  
  template() {
    effect(() => {
      console.log(`Count: ${this.count.get()}`);
      this.render();
    });
  }
  
  increment() {
    this.count.set(this.count.get() + 1);
  }
}
```

### Pattern 2: Store Integration (Redux-like)

```typescript
// Signal-based store
interface Store<T> {
  state: Signal<T>;
  dispatch(action: string, payload?: any): void;
  select<K extends keyof T>(key: K): Computed<T[K]>;
}

function createStore<T>(initialState: T, reducers: any): Store<T> {
  const state = signal(initialState);
  
  return {
    get state() {
      return state;
    },
    
    dispatch(action: string, payload?: any) {
      const reducer = reducers[action];
      if (reducer) {
        state.set(reducer(state.get(), payload));
      }
    },
    
    select<K extends keyof T>(key: K): Computed<T[K]> {
      return computed(() => state.get()[key]);
    }
  };
}

// Usage
const store = createStore(
  { count: 0, user: null as string | null },
  {
    INCREMENT: (state, payload) => ({ 
      ...state, 
      count: state.count + payload 
    }),
    SET_USER: (state, user) => ({ 
      ...state, 
      user 
    })
  }
);

// Selectors
const count = store.select('count');
const user = store.select('user');

// Effects
effect(() => {
  console.log('Count:', count.get());
});

// Dispatch
store.dispatch('INCREMENT', 1);
store.dispatch('SET_USER', 'John');
```

### Pattern 3: Form Integration

```typescript
interface FormField<T> {
  value: Signal<T>;
  errors: Signal<string[]>;
  touched: Signal<boolean>;
  dirty: Computed<boolean>;
  valid: Computed<boolean>;
}

function createFormField<T>(
  initialValue: T,
  validators: Array<(value: T) => string | null>
): FormField<T> {
  const value = signal(initialValue);
  const errors = signal<string[]>([]);
  const touched = signal(false);
  
  const dirty = computed(() => {
    return value.get() !== initialValue;
  });
  
  const valid = computed(() => {
    const errs = validators
      .map(v => v(value.get()))
      .filter((e): e is string => e !== null);
    
    errors.set(errs);
    return errs.length === 0;
  });
  
  return { value, errors, touched, dirty, valid };
}

// Usage
const emailField = createFormField(
  '',
  [
    v => !v ? 'Required' : null,
    v => !/^\S+@\S+\.\S+$/.test(v) ? 'Invalid email' : null
  ]
);

// Auto-validate on change
effect(() => {
  emailField.value.get(); // Track changes
  emailField.valid.get(); // Validate
});

// Check validity
console.log(emailField.valid.get());
```

### Pattern 4: Router Integration

```typescript
interface Route {
  path: string;
  component: any;
  params?: Record<string, any>;
}

class SignalRouter {
  private currentRoute = signal<Route | null>(null);
  private history: string[] = [];
  
  readonly current = computed(() => this.currentRoute.get());
  
  navigate(path: string, params?: Record<string, any>) {
    const route = this.matchRoute(path);
    if (route) {
      this.history.push(path);
      this.currentRoute.set({ ...route, params });
    }
  }
  
  back() {
    const prevPath = this.history.pop();
    if (prevPath) {
      this.navigate(prevPath);
    }
  }
  
  private matchRoute(path: string): Route | null {
    // Simple path matching logic
    return { path, component: null };
  }
}

// Usage
const router = new SignalRouter();

// React to route changes
effect(() => {
  const route = router.current.get();
  if (route) {
    console.log('Navigated to:', route.path);
    // Render component
  }
});

router.navigate('/users/123');
```

## Migration Strategies

### Migration 1: From Vuex

```typescript
// Before: Vuex store
// import { createStore } from 'vuex';
// const store = createStore({ ... });

// After: Signal store
const store = {
  state: signal({
    count: 0,
    user: null
  }),
  
  getters: {
    doubleCount: computed(() => store.state.get().count * 2)
  },
  
  mutations: {
    increment(payload) {
      store.state.set({
        ...store.state.get(),
        count: payload
      });
    }
  },
  
  actions: {
    asyncIncrement({ commit }) {
      setTimeout(() => {
        commit('increment', 1);
      }, 1000);
    }
  }
};

// Component usage
effect(() => {
  const state = store.state.get();
  console.log('Count:', state.count);
  console.log('Double:', store.getters.doubleCount.get());
});
```

### Migration 2: From Redux

```typescript
// Before: Redux
// const store = createStore(reducer, initialState);
// store.dispatch({ type: 'INCREMENT' });

// After: Signal Redux
const reduxStore = {
  state: signal(initialState),
  
  dispatch(action: any) {
    this.state.set(reducer(this.state.get(), action));
  },
  
  getState() {
    return this.state.get();
  },
  
  subscribe(listener: () => void) {
    return effect(() => {
      this.state.get(); // Track
      listener();
    });
  }
};

// Middleware support
const middlewareStore = {
  ...reduxStore,
  
  dispatch(action: any) {
    // Apply middleware chain
    const enhancedAction = middleware1(action);
    const finalAction = middleware2(enhancedAction);
    reduxStore.dispatch.call(this, finalAction);
  }
};
```

### Migration 3: From MobX

```typescript
// Before: MobX
// @observable count = 0;
// @computed get double() { return this.count * 2; }
// @action increment() { this.count++; }

// After: Signals
class Counter {
  count = signal(0);
  
  double = computed(() => this.count.get() * 2);
  
  increment() {
    this.count.set(this.count.get() + 1);
  }
}

// Before: MobX autorun
// autorun(() => {
//   console.log(counter.count);
// });

// After: Signals
effect(() => {
  console.log(counter.count.get());
});

// Before: MobX observe
// observe(counter.double, (change) => {
//   console.log(change.newValue);
// });

// After: Signals
let previousValue: number | undefined;
effect(() => {
  const newValue = counter.double.get();
  console.log('Changed from', previousValue, 'to', newValue);
  previousValue = newValue;
});
```

### Migration 4: From RxJS

```typescript
// Before: RxJS Observable
// const subject = new BehaviorSubject(0);
// subject.subscribe(value => console.log(value));
// subject.next(1);

// After: Signal
const subject = signal(0);

// Subscribe
effect(() => {
  console.log(subject.get());
});

// Next
subject.set(1);

// Operators pattern
function mapSignal<T, R>(
  source: Signal<T>,
  fn: (value: T) => R
): Computed<R> {
  return computed(() => fn(source.get()));
}

function filterSignal<T>(
  source: Signal<T>,
  predicate: (value: T) => boolean
): Computed<T | undefined> {
  return computed(() => {
    const value = source.get();
    return predicate(value) ? value : undefined;
  });
}

// Usage
const numbers = signal(0);
const doubled = mapSignal(numbers, n => n * 2);
const evenOnly = filterSignal(numbers, n => n % 2 === 0);
```

## Custom Reactive System

### Build Your Own Signal API

```typescript
import { createReactiveSystem } from './system';

// Create custom reactive system
const mySystem = createReactiveSystem({
  update(node) {
    // Custom update logic
    return true;
  },
  notify(effect) {
    // Custom notification
    queueMicrotask(() => {
      effect.fn();
    });
  },
  unwatched(node) {
    // Cleanup when no longer watched
    console.log('No longer watching', node);
  }
});

// Wrap in friendly API
export function ref<T>(value: T) {
  return mySystem.signal(value);
}

export function computed<T>(fn: () => T) {
  return mySystem.computed(fn);
}

export function effect(fn: () => void) {
  return mySystem.effect(fn);
}
```

### Plugin System

```typescript
interface SignalPlugin {
  install(system: any): void;
}

class PluginManager {
  private plugins: SignalPlugin[] = [];
  
  use(plugin: SignalPlugin) {
    this.plugins.push(plugin);
  }
  
  install(system: any) {
    this.plugins.forEach(plugin => plugin.install(system));
  }
}

// Example plugin: Persistence
class PersistPlugin implements SignalPlugin {
  constructor(private storage: Storage) {}
  
  install(system: any) {
    const originalSet = system.Signal.prototype.set;
    
    system.Signal.prototype.set = function(value: any) {
      const result = originalSet.call(this, value);
      
      // Save to localStorage
      if (this.key) {
        this.storage.setItem(this.key, JSON.stringify(value));
      }
      
      return result;
    };
  }
}

// Usage
const plugins = new PluginManager();
plugins.use(new PersistPlugin(localStorage));
plugins.install(mySystem);
```

## Interoperability

### Working with Promises

```typescript
// Async signal helper
function createAsyncSignal<T>(
  promiseFn: () => Promise<T>
): Signal<{
  data: T | null;
  loading: boolean;
  error: Error | null;
}> {
  const state = signal({
    data: null as T | null,
    loading: false,
    error: null as Error | null
  });
  
  const execute = async () => {
    state.set({ ...state.get(), loading: true });
    
    try {
      const data = await promiseFn();
      state.set({ data, loading: false, error: null });
    } catch (error) {
      state.set({ 
        data: null, 
        loading: false, 
        error: error as Error 
      });
    }
  };
  
  execute();
  
  return state;
}

// Usage
const userData = createAsyncSignal(() => 
  fetch('/api/user').then(r => r.json())
);

effect(() => {
  const s = userData.get();
  console.log('Loading:', s.loading);
  console.log('Data:', s.data);
  console.log('Error:', s.error);
});
```

### Working with Events

```typescript
// Event to signal adapter
function fromEvent<T>(
  target: EventTarget,
  eventName: string
): Signal<T | null> {
  const eventSignal = signal<T | null>(null);
  
  target.addEventListener(eventName, (e: Event) => {
    eventSignal.set(e as unknown as T);
  });
  
  return eventSignal;
}

// Usage
const clicks = fromEvent<MouseEvent>(button, 'click');
const scrolls = fromEvent<Event>(window, 'scroll');

effect(() => {
  if (clicks.get()) {
    console.log('Button clicked!');
  }
});
```

### Working with WebSockets

```typescript
// WebSocket to signal stream
function fromWebSocket<T>(url: string): Signal<T[]> {
  const messages = signal<T[]>([]);
  const ws = new WebSocket(url);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    messages.set([...messages.get(), data]);
  };
  
  return messages;
}

// Usage
const chatMessages = fromWebSocket<ChatMessage>('ws://chat.example.com');

effect(() => {
  const msgs = chatMessages.get();
  console.log('New message:', msgs[msgs.length - 1]);
});
```

## Best Practices

### DO ✅

```typescript
// Use effectScope for components
class Component {
  private stopScope?: () => void;
  
  mount() {
    this.stopScope = effectScope(() => {
      // All effects here
    });
  }
  
  unmount() {
    this.stopScope?.();
  }
}

// Batch related updates
startBatch();
user.setName('John');
user.setEmail('john@example.com');
user.setAge(30);
endBatch();

// Use computed for derived state
const fullName = computed(() => 
  `${firstName.get()} ${lastName.get()}`
);

// Clean up effects
const stop = effect(() => { ... });
return () => stop();
```

### DON'T ❌

```typescript
// Don't mutate objects directly
user.get().name = 'John'; // Won't trigger!

// Don't forget cleanup
effect(() => { ... }); // Missing stop()

// Don't create effects in loops without scope
data.forEach(item => {
  effect(() => { ... }); // Memory leak!
});

// Don't batch unrelated updates
startBatch();
unrelated1.set(1);
unrelated2.set(2); // Unnecessary coupling
endBatch();
```

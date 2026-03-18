---
name: signal-code-generation
description: Generate production-ready TypeDom Signals code including components, stores, hooks, patterns, and tests. Automate scaffolding and repetitive coding tasks with proven templates.
---

# Signal Code Generation Skill

You are a code generation expert for TypeDom Signals. You generate production-ready signal implementations, create reusable patterns, scaffold common architectures, and automate repetitive coding tasks.

## When to Use This Skill

This skill applies when the user wants to:

- **Scaffold new artifacts**: Components, stores, custom hooks
- **Generate patterns**: CRUD operations, form validation, state machines
- **Create tests**: Unit tests for signal-based code
- **Refactor code**: Convert existing code to use signals
- **Migrate state**: From Vuex, Redux, MobX to signals
- **Generate utilities**: Debounce, throttle, watch helpers

## Key Principles

1. **Match existing patterns** - Study repo conventions before generating
2. **Complete working code** - All imports, types, exports must be correct
3. **Include error handling** - Async code needs try/catch and error states
4. **Add cleanup logic** - Effects and scopes must be properly disposed
5. **Verify with checks** - Generated code should pass typecheck/lint/test
6. **Type safety first** - Always TypeScript with strict mode
7. **Composition over inheritance** - Use functions and composition

## Configuration Defaults

| Parameter              | Default       | Description                                    |
| ---------------------- | ------------- | ---------------------------------------------- |
| `--typescript`         | true          | Generate TypeScript code                       |
| `--strict-nulls`       | true          | Enable strict null checking                    |
| `--eslint-config`      | standard      | ESLint preset: standard, minimal, strict       |
| `--test-coverage`      | true          | Generate tests alongside implementation        |
| `--doc-style`          | jsdoc         | Documentation style: jsdoc, tsdoc, none        |

## Step-by-Step Process

### 1. Analyze Request and Existing Patterns

Before generating code:

```bash
# Examine existing signal usage
grep -r "from '@type-dom/signals'" src/

# Check naming conventions
find src -name "*.ts" | grep -E "(store|component)" | head -10

# Verify project structure
ls -la src/
```

**Check**:
- What artifact type is needed? (Component/Store/Hook/Utility)
- What are the naming conventions?
- What dependencies already exist?

### 2. Select Generator Template

| Request Type           | Template                    | Example                    |
| ---------------------- | --------------------------- | -------------------------- |
| New component          | `/generate component`       | Counter, UserProfile       |
| State management       | `/generate store`           | UserStore, ProductStore    |
| Reusable logic         | `/generate hook`            | useFetch, useLocalStorage  |
| Data operations        | `/pattern crud`             | User CRUD, Product CRUD    |
| Form handling          | `/pattern form`             | LoginForm, RegisterForm    |
| State workflow         | `/pattern statemachine`     | AuthState, OrderState      |
| Quick utilities        | `/snip <utility>`           | debounce, throttle, watch  |
| Test generation        | `/generate tests`           | For any component/store    |
| Refactoring            | `/refactor <type>`          | class-to-signals, vuex     |

### 3. Gather Required Options

**For Components**:
- Component name (PascalCase)
- Props with types
- Emits (optional)
- Computed properties (optional)

**For Stores**:
- Store name
- State fields with types
- Getters/actions/mutations

**For Hooks**:
- Hook name (useXxx format)
- Input parameters
- Return values

### 4. Generate the Code

Use appropriate generator function with collected options.

### 5. Verify File Placement

```bash
# Check if file exists
test -f src/components/Counter.ts && echo "EXISTS" || echo "SAFE TO CREATE"

# Verify directory structure
ls -la src/components/
```

### 6. Create Supporting Files

- **Test files**: `.spec.ts` alongside implementation
- **Types**: Add to `types/` or co-locate
- **Exports**: Update barrel exports
- **Docs**: Add JSDoc comments

### 7. Format and Validate

```bash
# Format
npm run format

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm test -- path/to/generated.spec.ts
```

### 8. Wire Up Dependencies

- Import in parent components
- Register in DI if needed
- Add to module imports
- Export from shared index

## Generator Templates

### Generator 1: Reactive Component

**Command**: `/generate component <Name>`

**Options**:
```typescript
interface ComponentOptions {
  name: string;           // PascalCase
  props?: Record<string, string>;  // propName: type
  emits?: string[];
  template?: string;
}
```

**Example**:
```typescript
// Generate Counter component
const counterCode = generateComponent({
  name: 'Counter',
  props: {
    initialValue: 'number',
    step: 'number'
  },
  emits: ['change']
});
```

**Generated Output**:
```typescript
import { effectScope, signal, computed } from '@type-dom/signals';

export class Counter {
  // Props
  initialValue = signal<number>();
  step = signal<number>();

  // Lifecycle
  private stopScope?: () => void;

  constructor() {
    this.stopScope = effectScope(() => {
      this.setup();
    });
  }

  setup() {
    // Setup effects and watchers
    effect(() => {
      console.log('Initial:', initialValue.get());
    });
  }

  // Methods - add your logic here

  dispose() {
    this.stopScope?.();
  }
}
```

**Next Steps**:
1. Implement component-specific logic
2. Add methods
3. Create template/render function
4. Write tests
5. Export from index

### Generator 2: Store Module

**Command**: `/generate store <Name>Store`

**Options**:
```typescript
interface StoreModule {
  name: string;
  state: Record<string, string>;      // fieldName: type
  getters?: Record<string, string>;   // getterName: expression
  actions?: Record<string, string>;   // actionName: params
  mutations?: Record<string, string>; // mutationName: params
}
```

**Example**:
```typescript
const userStoreCode = generateStoreModule({
  name: 'User',
  state: {
    currentUser: 'User | null',
    isLoading: 'boolean',
    error: 'Error | null'
  },
  getters: {
    isLoggedIn: 'this.currentUser.get() !== null',
    userName: 'this.currentUser.get()?.name ?? "Guest"'
  },
  actions: {
    fetchUser: 'userId: string',
    login: 'credentials: LoginCredentials'
  }
});
```

**Next Steps**:
1. Implement action logic with API calls
2. Add error handling
3. Create store tests
4. Wire up in app initialization

### Generator 3: Custom Hook

**Command**: `/generate hook <name>`

**Options**:
```typescript
interface HookOptions {
  name: string;                      // useXxx format
  inputs: Record<string, string>;    // paramName: type
  outputs: Record<string, string>;   // outputName: type
  dependencies?: string[];           // signal imports
}
```

**Example**:
```typescript
const useFetchCode = generateHook({
  name: 'useFetch',
  inputs: {
    url: 'string',
    options: 'RequestInit'
  },
  outputs: {
    data: 'T | null',
    loading: 'boolean',
    error: 'Error | null',
    refetch: '() => void'
  },
  dependencies: ['signal', 'computed', 'effect']
});
```

**Next Steps**:
1. Implement hook logic
2. Add error handling
3. Handle cleanup
4. Write hook tests

## Pattern Templates

### Pattern 1: CRUD Operations

**Command**: `/pattern crud <EntityName>`

**Options**:
```typescript
interface CrudOptions {
  entityName: string;
  idType: string;
  dtoType: string;
  serviceUrl: string;
}
```

**Example**:
```typescript
const userCrud = generateCrudPattern({
  entityName: 'User',
  idType: 'number',
  dtoType: 'UserDTO',
  serviceUrl: '/api/users'
});
```

**Generated Features**:
- ✅ List/fetch all entities
- ✅ Create new entity
- ✅ Update existing entity
- ✅ Delete entity
- ✅ Select entity
- ✅ Loading/error states
- ✅ Computed selected entity

**Next Steps**:
1. Define DTO interface
2. Implement API calls
3. Add validation
4. Write integration tests

### Pattern 2: Form Validation

**Command**: `/pattern form <FormName>`

**Options**:
```typescript
interface FormFieldConfig {
  name: string;
  type: string;
  validators: string[];
  initialValue: any;
}
```

**Example**:
```typescript
const loginFormCode = generateFormValidation([
  {
    name: 'email',
    type: 'string',
    validators: [
      '!v',
      '/^\\S+@\\S+\\.\\S+$/.test(v)'
    ],
    initialValue: ''
  },
  {
    name: 'password',
    type: 'string',
    validators: ['!v', 'v.length >= 6'],
    initialValue: ''
  }
]);
```

**Generated Features**:
- ✅ Value signals for each field
- ✅ Error signals
- ✅ Touched tracking
- ✅ Computed validity
- ✅ Dirty checking
- ✅ Auto-validate on change

**Next Steps**:
1. Customize validation messages
2. Add submit handler
3. Style error display
4. Test form submission

### Pattern 3: State Machine

**Command**: `/pattern statemachine <Name>`

**Options**:
```typescript
interface StateMachineConfig {
  name: string;
  states: string[];
  events: Array<{
    name: string;
    from: string;
    to: string;
    guard?: string;
  }>;
}
```

**Example**:
```typescript
const authMachineCode = generateStateMachine({
  name: 'Auth',
  states: ['idle', 'loading', 'authenticated', 'error'],
  events: [
    { name: 'login', from: 'idle', to: 'loading' },
    { name: 'success', from: 'loading', to: 'authenticated' },
    { name: 'failure', from: 'loading', to: 'error' },
    { name: 'logout', from: 'authenticated', to: 'idle' }
  ]
});
```

**Next Steps**:
1. Add guards if needed
2. Implement event handlers
3. Add transition logging
4. Test all state transitions

## Quick Snippets

### Debounced Signal
```typescript
// /snip debounce
function createDebouncedSignal<T>(initialValue: T, delayMs: number) {
  const pending = signal<T>(initialValue);
  const committed = signal<T>(initialValue);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return {
    get: () => committed.get(),
    set: (value: T) => {
      pending.set(value);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        committed.set(pending.get());
        timeoutId = null;
      }, delayMs);
    }
  };
}
```

### Throttled Signal
```typescript
// /snip throttle
function createThrottledSignal<T>(initialValue: T, intervalMs: number) {
  const value = signal<T>(initialValue);
  let lastUpdate = 0;
  let pending: T | null = null;
  
  return {
    get: () => value.get(),
    set: (newValue: T) => {
      const now = Date.now();
      if (now - lastUpdate >= intervalMs) {
        value.set(newValue);
        lastUpdate = now;
      } else {
        pending = newValue;
        setTimeout(() => {
          if (pending !== null) {
            value.set(pending);
            pending = null;
          }
        }, intervalMs - (now - lastUpdate));
      }
    }
  };
}
```

### Async Computed
```typescript
// /snip async-computed
function asyncComputed<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  deps: (() => any)[]
): Computed<T> {
  const result = signal<T>(defaultValue);
  const loading = signal(false);
  const error = signal<Error | null>(null);
  
  effect(() => {
    deps.forEach(d => d());
    
    loading.set(true);
    fn()
      .then(data => {
        result.set(data);
        error.set(null);
      })
      .catch(err => error.set(err as Error))
      .finally(() => loading.set(false));
  });
  
  return computed(() => result.get());
}
```

### Watch Helper
```typescript
// /snip watch
function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T) => void,
  options: { immediate?: boolean; deep?: boolean } = {}
): () => void {
  let oldValue = source();
  
  if (options.immediate) {
    callback(oldValue, oldValue);
  }
  
  return effect(() => {
    const newValue = source();
    if (newValue !== oldValue) {
      const old = oldValue;
      oldValue = newValue;
      callback(newValue, old);
    }
  });
}
```

## Test Generation

**Command**: `/generate tests for <ComponentName>`

**Example**:
```typescript
const counterTests = generateTests(counterCode, 'Counter');
```

**Generated Test Structure**:
```typescript
import { test, expect } from 'vitest';
import { Counter } from '../src/Counter';

describe('Counter', () => {
  test('should initialize correctly', () => {
    const component = new Counter();
    // Assertions
  });

  test('should respond to prop changes', () => {
    // Test reactivity
  });

  test('should cleanup on dispose', () => {
    const component = new Counter();
    component.dispose();
    // Verify cleanup
  });
});
```

## Refactoring Tools

### Refactor 1: Class to Signals

**Command**: `/refactor class-to-signals <File>`

Converts traditional class properties to signals:
- Properties → signal()
- Getters → computed()
- Setters → signal.set()

### Refactor 2: Vuex to Signals

**Command**: `/refactor vuex-to-signals <StoreFile>`

Migrates Vuex stores to signals:
- state → signal()
- mutations → set() calls
- actions → async functions
- getters → computed()

## Common Issues and Solutions

### Issue 1: Missing Cleanup

**Problem**: Effects running after component unmount

**Solution**: Always use effectScope and dispose:
```typescript
class Component {
  private stopScope?: () => void;
  
  constructor() {
    this.stopScope = effectScope(() => {
      // All effects here
    });
  }
  
  destroy() {
    this.stopScope?.();
  }
}
```

### Issue 2: Object Mutation Not Triggering

**Problem**: `obj.get().prop = value` doesn't trigger update

**Solution**: Replace entire object:
```typescript
// ❌ Wrong
user.get().name = 'John';

// ✅ Correct
user.set({ ...user.get(), name: 'John' });

// OR use trigger
user.get().name = 'John';
trigger(user);
```

### Issue 3: Infinite Loop

**Problem**: Circular dependency causes infinite loop

**Solution**: Break cycle with intermediate signal:
```typescript
// ❌ Circular
const a = computed(() => b.get());
const b = computed(() => a.get());

// ✅ Fixed
const input = signal(0);
const a = computed(() => input.get());
const b = computed(() => a.get() + 1);
input.set(b.get()); // Controlled update
```

## Quality Checklist

Before considering generated code complete:

- [ ] All imports are correct
- [ ] Types are properly defined
- [ ] Error handling included
- [ ] Cleanup logic added
- [ ] Tests created
- [ ] Formatting applied
- [ ] Lint passes
- [ ] Type check passes
- [ ] Tests pass
- [ ] Matches repo conventions

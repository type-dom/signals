# Signals 库通义灵码编码规则

> 📍 **@type-dom/signals** - TypeDOM 响应式系统核心库  
> ⚡ 基于 Push-Pull 模型的高性能响应式信号系统  
> 🎯 适用于：libs/signals 目录及相关开发

---

## 📋 规则索引

- [1. 核心原则](#1-核心原则)
- [2. Signal 使用规范](#2-signal-使用规范)
- [3. Computed 使用规范](#3-computed-使用规范)
- [4. Effect 使用规范](#4-effect-使用规范)
- [5. Trigger 使用规范](#5-trigger-使用规范)
- [6. 批量更新规范](#6-批量更新规范)
- [7. Effect Scope 规范](#7-effect-scope-规范)
- [8. 类型定义规范](#8-类型定义规范)
- [9. 测试编写规范](#9-测试编写规范)
- [10. 性能优化规范](#10-性能优化规范)
- [11. 常见反模式](#11-常见反模式)
- [12. 代码示例](#12-代码示例)

---

## 1. 核心原则

### 1.1 响应式设计原则

✅ **必须遵守：**
- 使用 `get()` 读取值以建立依赖关系
- 使用 `set()` 设置值以触发更新
- 避免直接访问内部属性（`currentValue`, `pendingValue`）

```typescript
// ✅ 正确
const count = signal(0);
const value = count.get();
count.set(1);

// ❌ 错误
const count = signal(0);
const value = count.currentValue;  // 禁止直接访问
count.pendingValue = 1;            // 禁止直接修改
```

### 1.2 依赖追踪原则

✅ **自动依赖追踪：**
- 在 effect/computed 中调用 `signal.get()` 自动建立依赖
- 依赖只在读取时建立，写入时不建立
- 避免在条件语句中读取依赖（可能导致追踪不完整）

```typescript
// ✅ 正确 - 依赖完整追踪
effect(() => {
  const a = signalA.get();
  const b = signalB.get();
  console.log(a + b);
});

// ❌ 错误 - 依赖可能不完整
effect(() => {
  if (condition) {
    console.log(signalA.get());  // condition 为 false 时不追踪
  }
});
```

### 1.3 更新传播原则

✅ **理解更新机制：**
- Signal 的 `set()` 会立即触发 `propagate()` 和 `flush()`（非 batch 模式）
- Computed 的 setter 使用 `trigger()` 而非直接通知
- 数组/对象引用不变但内部变化时，需手动调用 `trigger()`

---

## 2. Signal 使用规范

### 2.1 创建 Signal

```typescript
// ✅ 推荐：明确类型
const count: Signal<number> = signal(0);
const items: Signal<Item[]> = signal([]);

// ✅ 推荐：使用泛型
const user = signal<User | null>(null);

// ❌ 避免：类型推断不明确
const data = signal();  // 类型不明
```

### 2.2 读取 Signal

```typescript
// ✅ 正确：使用 get()
const value = mySignal.get();

// ❌ 错误：直接访问属性
const value = mySignal.currentValue;
```

### 2.3 设置 Signal

```typescript
// ✅ 正确：使用 set()
mySignal.set(newValue);

// ✅ 正确：对于数组/对象，创建新引用
arr.set([...arr.get(), newItem]);
obj.set({ ...obj.get(), prop: newValue });

// ❌ 错误：直接修改内部值
arr.get().push(item);      // 不会触发更新
obj.get().prop = value;    // 不会触发更新

// ⚠️ 注意：如果必须修改引用类型内部，使用 trigger()
arr.get().push(item);
trigger(arr);  // 手动触发更新
```

### 2.4 处理引用类型

```typescript
// ✅ 数组操作 - 创建新数组
const arr = signal<number[]>([1, 2, 3]);

// 添加元素
arr.set([...arr.get(), 4]);
arr.set([...arr.get(), ...newItems]);

// 删除元素
arr.set(arr.get().filter(x => x !== target));

// 修改元素
arr.set(arr.get().map(x => x === old ? new : x));

// ❌ 避免：直接修改原数组
arr.get().push(4);           // 不会触发更新
arr.get()[0] = 100;          // 不会触发更新
```

```typescript
// ✅ 对象操作 - 创建新对象
const obj = signal({ name: 'John', age: 30 });

// 修改属性
obj.set({ ...obj.get(), name: 'Jane' });
obj.set({ ...obj.get(), age: obj.get().age + 1 });

// 删除属性
const { age, ...rest } = obj.get();
obj.set(rest);

// ❌ 避免：直接修改原对象
obj.get().name = 'Jane';     // 不会触发更新
delete obj.get().age;        // 不会触发更新
```

---

## 3. Computed 使用规范

### 3.1 创建 Computed

```typescript
// ✅ 正确：纯函数，无副作用
const fullName = computed(() => {
  return `${firstName.get()} ${lastName.get()}`;
});

// ✅ 正确：可以依赖多个 signals
const total = computed(() => {
  return price.get() * quantity.get() * (1 - discount.get());
});

// ❌ 错误：包含副作用
const bad = computed(() => {
  console.log('计算中...');  // 不应该有副作用
  return someValue.get();
});

// ❌ 错误：修改状态
const worse = computed(() => {
  counter.set(counter.get() + 1);  // 禁止在 computed 中修改
  return counter.get();
});
```

### 3.2 可编辑的 Computed

```typescript
// ✅ 正确：提供 setter
const value = signal(10);
const doubled = computed(
  () => value.get() * 2,
  (newValue: number) => value.set(newValue / 2)
);

doubled.set(30);  // value 变为 15
console.log(value.get());  // 15

// ⚠️ 注意：setter 应该同步且无副作用
const badComputed = computed(
  () => data.get(),
  async (val) => {  // ❌ 不要使用异步 setter
    await api.save(val);
  }
);
```

### 3.3 Computed 缓存

✅ **理解缓存机制：**
- Computed 会缓存结果，只在依赖变化时重新计算
- 首次访问时才计算（lazy evaluation）
- 避免在 computed 中进行昂贵计算而不缓存

```typescript
// ✅ 推荐：利用缓存
const expensive = computed(() => {
  return heavyComputation(data.get());  // 只在 data 变化时执行
});

// ❌ 避免：每次访问都重新计算
const alwaysRecalc = computed(() => {
  return Date.now();  // 每次都不同，缓存无效
});
```

---

## 4. Effect 使用规范

### 4.1 创建 Effect

```typescript
// ✅ 正确：处理副作用
const stop = effect(() => {
  console.log('Count:', count.get());
  domElement.textContent = `Value: ${value.get()}`;
});

// ✅ 正确：返回清理函数
const stop = effect(() => {
  const timer = setInterval(() => {
    console.log(count.get());
  }, 1000);
  
  return () => clearInterval(timer);
});

// ❌ 错误：返回非函数值
effect(() => {
  return count.get();  // 返回值被忽略
});
```

### 4.2 停止 Effect

```typescript
// ✅ 正确：及时清理
const stop = effect(() => {
  // ...
});

// 组件销毁或不再需要时
stop();

// ✅ 推荐：在 effectScope 中管理
const stopScope = effectScope(() => {
  effect(() => { /* ... */ });
  effect(() => { /* ... */ });
});

// 一次性清理所有
stopScope();
```

### 4.3 Effect 中的异步操作

```typescript
// ❌ 错误：直接在 effect 中使用 async/await
effect(async () => {
  const data = await fetchData();  // 不会追踪依赖
  result.set(data);
});

// ✅ 正确：使用 Promise.then
effect(() => {
  fetchData().then(data => {
    result.set(data);
  });
});

// ✅ 推荐：使用单独的 signal 存储异步结果
const loading = signal(false);
const error = signal<string | null>(null);
const data = signal<Data | null>(null);

effect(() => {
  loading.set(true);
  fetchData()
    .then(d => {
      data.set(d);
      error.set(null);
    })
    .catch(e => error.set(e.message))
    .finally(() => loading.set(false));
});
```

---

## 5. Trigger 使用规范

### 5.1 使用场景

✅ **适用场景：**
1. 数组/对象内部变化但引用不变
2. Map/Set 等集合类型操作
3. 强制重新计算 computed
4. 与第三方库集成（库直接修改数据）

```typescript
// ✅ 场景 1：数组内部变化
const arr = signal<number[]>([1, 2, 3]);
arr.get().push(4);
trigger(arr);  // 手动触发

// ✅ 场景 2：Map 操作
const map = signal(new Map<string, number>());
map.get().set('key', 1);
trigger(map);

// ✅ 场景 3：强制计算
const c = computed(() => expensive(data.get()));
trigger(c);  // 强制重新计算

// ✅ 场景 4：第三方库修改
externalLib.mutate(mySignal.get());
trigger(mySignal);
```

### 5.2 Trigger 用法

```typescript
// ✅ 触发单个 signal
trigger(mySignal);

// ✅ 触发函数
trigger(() => {
  signalA.get();
  signalB.get();
});

// ✅ 在 batch 中使用
startBatch();
trigger(signalA);
trigger(signalB);
endBatch();
```

### 5.3 Trigger vs Set

```typescript
// ✅ 优先使用 set() 创建新引用
arr.set([...arr.get(), item]);  // 推荐

// ⚠️ 必要时使用 trigger()
arr.get().push(item);  // 无法创建新引用时
trigger(arr);          // 手动触发
```

---

## 6. 批量更新规范

### 6.1 使用 Batch

```typescript
// ✅ 推荐：合并多次更新
startBatch();
signalA.set(1);
signalB.set(2);
signalC.set(3);
endBatch();  // 只触发一次更新

// ❌ 避免：多次单独更新
signalA.set(1);  // 触发更新
signalB.set(2);  // 触发更新
signalC.set(3);  // 触发更新
```

### 6.2 嵌套 Batch

```typescript
// ✅ 支持嵌套
startBatch();
a.set(1);

startBatch();  // 深度 +1
b.set(2);
endBatch();    // 深度 -1，但不 flush

c.set(3);
endBatch();    // 深度 0，执行 flush
```

### 6.3 检查 Batch 深度

```typescript
// ✅ 调试时使用
console.log('Batch depth:', getBatchDepth());

if (getBatchDepth() === 0) {
  // 不在 batch 中
}
```

---

## 7. Effect Scope 规范

### 7.1 创建作用域

```typescript
// ✅ 正确：管理多个 effects
const stopScope = effectScope(() => {
  effect(() => {
    // effect 1
  });
  
  effect(() => {
    // effect 2
  });
});

// 清理所有
stopScope();
```

### 7.2 获取当前作用域

```typescript
// ✅ 正确
const currentScope = getCurrentScope();

// 保存并恢复
const prevScope = getCurrentScope();
setCurrentScope(newScope);
// ... 操作
setCurrentScope(prevScope);
```

### 7.3 作用域嵌套

```typescript
// ✅ 支持嵌套
const outer = effectScope(() => {
  effect(() => { /* outer effect */ });
  
  const inner = effectScope(() => {
    effect(() => { /* inner effect */ });
  });
  
  // 清理 inner
  inner();
});

// 清理 outer（包括所有 nested effects）
outer();
```

---

## 8. 类型定义规范

### 8.1 使用工具函数

```typescript
// ✅ 类型判断
if (isSignal(value)) {
  // value 是 Signal
}

if (isComputed(value)) {
  // value 是 Computed
}

if (isEffect(fn)) {
  // fn 是 effect 返回的清理函数
}

if (isEffectScope(fn)) {
  // fn 是 effectScope 返回的清理函数
}
```

### 8.2 ReactiveFlags 使用

```typescript
// ✅ 理解标志位
enum ReactiveFlags {
  None = 0,           // 000000
  Mutable = 1,        // 000001
  Watching = 2,       // 000010
  RecursedCheck = 4,  // 000100
  Recursed = 8,       // 001000
  Dirty = 16,         // 010000
  Pending = 32,       // 100000
}

// ✅ 位运算检查
if (flags & ReactiveFlags.Dirty) {
  // 是 dirty 状态
}

if (flags & ReactiveFlags.Watching) {
  // 正在监听
}
```

---

## 9. 测试编写规范

### 9.1 测试组织

```typescript
import { describe, expect, it } from 'vitest';
import { signal, computed, effect } from '../src';

describe('Signal API', () => {
  describe('signal()', () => {
    it('should create signal with initial value', () => {
      const count = signal(0);
      expect(count.get()).toBe(0);
    });

    it('should update with set()', () => {
      const count = signal(0);
      count.set(5);
      expect(count.get()).toBe(5);
    });
  });

  describe('array handling', () => {
    it('should trigger on array mutation with trigger()', () => {
      const arr = signal<number[]>([]);
      arr.get().push(1);
      trigger(arr);
      expect(arr.get().length).toBe(1);
    });
  });
});
```

### 9.2 测试覆盖

✅ **必须测试的场景：**
1. 基础功能（创建、读取、设置）
2. 依赖追踪
3. 计算属性缓存
4. effect 自动重新执行
5. 批量更新行为
6. 边界情况（null、undefined、空数组/对象）
7. 引用类型处理

### 9.3 异步测试

```typescript
// ✅ 正确：使用 async/await
it('should handle async', async () => {
  const data = signal<string | null>(null);
  
  effect(() => {
    Promise.resolve('test').then(d => data.set(d));
  });
  
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      expect(data.get()).toBe('test');
      resolve();
    }, 10);
  });
});
```

---

## 10. 性能优化规范

### 10.1 避免不必要的计算

```typescript
// ✅ 推荐：使用 computed 缓存
const expensive = computed(() => {
  return heavyCalculation(data.get());
});

// ❌ 避免：重复计算
effect(() => {
  const result = heavyCalculation(data.get());  // 每次都执行
  console.log(result);
});
```

### 10.2 批量更新

```typescript
// ✅ 推荐：批量更新减少刷新次数
startBatch();
for (let i = 0; i < 100; i++) {
  signals[i].set(values[i]);
}
endBatch();

// ❌ 避免：循环中单独更新
for (let i = 0; i < 100; i++) {
  signals[i].set(values[i]);  // 触发 100 次更新
}
```

### 10.3 及时清理

```typescript
// ✅ 推荐：及时清理不需要的 effects
const stop = effect(() => {
  // ...
});

// 组件销毁时
onDestroy(() => {
  stop();
});

// ✅ 推荐：使用 effectScope 批量清理
const stopScope = effectScope(() => {
  // 多个 effects
});

onDestroy(() => {
  stopScope();  // 一次性清理所有
});
```

---

## 11. 常见反模式

### 11.1 ❌ 在 Reaction 回调中修改同一个 Signal

```typescript
// ❌ 错误：可能导致无限循环
reaction(() => value.get(), () => {
  if (value.get() === true) {
    value.set(false);  // 修改被监听的 signal
  }
});

// ✅ 正确：使用 effect 处理
effect(() => {
  if (value.get() === true) {
    value.set(false);
  }
});
```

### 11.2 ❌ 直接修改引用类型

```typescript
// ❌ 错误
const arr = signal<number[]>([]);
arr.get().push(1);  // 不会触发更新

// ✅ 正确
arr.set([...arr.get(), 1]);

// 或使用 trigger
arr.get().push(1);
trigger(arr);
```

### 11.3 ❌ 在 Effect 中返回非函数

```typescript
// ❌ 错误
effect(() => {
  return count.get();  // 返回值被忽略
});

// ✅ 正确
effect(() => {
  console.log(count.get());
  // 或者返回清理函数
  return () => {
    // cleanup
  };
});
```

### 11.4 ❌ 忘记清理 Effects

```typescript
// ❌ 错误：内存泄漏
component.mount(() => {
  effect(() => {
    // 永久监听
  });
});

// ✅ 正确：及时清理
const stop = effect(() => {
  // ...
});

component.destroy(() => {
  stop();
});
```

### 11.5 ❌ 滥用 Trigger

```typescript
// ❌ 错误：过度使用 trigger
effect(() => {
  const val = signal.get();
  trigger(signal);  // 每次都触发
});

// ✅ 正确：只在必要时使用
if (needsManualTrigger) {
  trigger(signal);
}
```

---

## 12. 代码示例

### 12.1 计数器组件

```typescript
import { signal, computed, effect } from '@type-dom/signals';

class Counter {
  private count = signal(0);
  private doubleCount = computed(() => this.count.get() * 2);
  
  constructor() {
    // 监听变化
    effect(() => {
      console.log('Count:', this.count.get());
      console.log('Double:', this.doubleCount.get());
    });
  }
  
  increment() {
    this.count.set(this.count.get() + 1);
  }
  
  reset() {
    this.count.set(0);
  }
  
  getCount(): number {
    return this.count.get();
  }
  
  getDoubleCount(): number {
    return this.doubleCount.get();
  }
}
```

### 12.2 表单状态管理

```typescript
import { signal, computed, effectScope } from '@type-dom/signals';

interface FormState {
  fields: Record<string, any>;
  errors: Record<string, string>;
  submitting: boolean;
}

class FormManager {
  private state = signal<FormState>({
    fields: {},
    errors: {},
    submitting: false
  });
  
  private isValid = computed(() => {
    const errors = this.state.get().errors;
    return Object.keys(errors).length === 0;
  });
  
  constructor() {
    // 使用 effectScope 管理所有副作用
    effectScope(() => {
      effect(() => {
        const fields = this.state.get().fields;
        console.log('Form fields changed:', fields);
      });
      
      effect(() => {
        if (this.isValid.get()) {
          console.log('Form is valid');
        }
      });
    });
  }
  
  setField(name: string, value: any) {
    const currentState = this.state.get();
    this.state.set({
      ...currentState,
      fields: {
        ...currentState.fields,
        [name]: value
      }
    });
  }
  
  setError(field: string, message: string) {
    const currentState = this.state.get();
    this.state.set({
      ...currentState,
      errors: {
        ...currentState.errors,
        [field]: message
      }
    });
  }
  
  async submit() {
    if (!this.isValid.get()) return;
    
    const currentState = this.state.get();
    this.state.set({
      ...currentState,
      submitting: true
    });
    
    try {
      await api.submit(currentState.fields);
    } finally {
      this.state.set({
        ...this.state.get(),
        submitting: false
      });
    }
  }
}
```

### 12.3 列表操作

```typescript
import { signal, computed, trigger } from '@type-dom/signals';

interface Item {
  id: number;
  name: string;
}

class ListManager {
  private items = signal<Item[]>([]);
  private count = computed(() => this.items.get().length);
  
  // ✅ 推荐：创建新数组
  addItem(item: Item) {
    this.items.set([...this.items.get(), item]);
  }
  
  removeItem(id: number) {
    this.items.set(this.items.get().filter(item => item.id !== id));
  }
  
  updateItem(id: number, updates: Partial<Item>) {
    this.items.set(
      this.items.get().map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }
  
  // ⚠️ 使用 trigger 的场景
  sortItems() {
    const items = this.items.get();
    items.sort((a, b) => a.name.localeCompare(b.name));
    trigger(this.items);  // 引用没变，需要手动触发
  }
  
  clearAll() {
    this.items.set([]);
  }
  
  getCount(): number {
    return this.count.get();
  }
  
  getAllItems(): Item[] {
    return this.items.get();
  }
}
```

---

## 📚 相关文档

- [Signals API 完全指南](./SIGNALS-API-GUIDE.md)
- [架构指南](./ARCHITECTURE-GUIDE.md)
- [测试指南](./TESTING-GUIDE.md)
- [性能优化指南](./PERFORMANCE-GUIDE.md)
- [故障排查指南](./TROUBLESHOOTING-GUIDE.md)

---

**最后更新**: 2026-03-14  
**维护者**: TypeDOM Core Team  
**许可**: MIT License

# TypeDOM Signals - 问题排查指南

> 🔍 **常见问题诊断与解决方案**  
> 🛠️ 快速定位和修复响应式问题

---

## 📋 目录

1. [信号更新问题](#信号更新问题)
2. [计算属性问题](#计算属性问题)
3. [Effect 副作用问题](#effect 副作用问题)
4. [作用域管理问题](#作用域管理问题)
5. [性能问题](#性能问题)
6. [类型错误问题](#类型错误问题)

---

## 信号更新问题

### 问题 1: 更新不触发重新渲染

**症状**: 调用 `signal.set()` 后 UI 没有更新

**可能原因**:
1. 值相同未触发通知
2. 直接修改对象/数组内部
3. 依赖关系未正确建立

**解决方案**:

```typescript
// ❌ 问题 1: 值相同
const count = signal(0);
count.set(0); // 不会触发更新

// ✅ 解决：确保值不同
count.set(1);


// ❌ 问题 2: 直接修改对象
const state = signal({ count: 0 });
state.get().count++; // 不会触发更新

// ✅ 解决：创建新对象
state.update(s => ({ ...s, count: s.count + 1 }));


// ❌ 问题 3: 未在 effect/computed 中读取
const count = signal(0);
let result;
// 只是普通赋值，没有建立依赖
result = count.get(); 

// ✅ 解决：在 effect/computed 中使用
effect(() => {
  console.log(count.get()); // 建立依赖
});
```

### 问题 2: 无限循环更新

**症状**: 控制台报错 "Maximum call stack size exceeded" 或程序卡死

**可能原因**:
1. Effect 中修改自身依赖的信号
2. Computed 的 getter 产生副作用
3. 循环依赖

**解决方案**:

```typescript
// ❌ 问题 1: Effect 中修改依赖
const count = signal(0);
effect(() => {
  console.log(count.get());
  count.set(count.get() + 1); // 无限循环！
});

// ✅ 解决：移除 effect 中的修改
effect(() => {
  console.log(count.get());
  // 不要在这里修改 count
});


// ❌ 问题 2: Computed getter 有副作用
const count = signal(0);
const doubled = computed(() => {
  count.set(count.get() + 1); // 每次 get 都修改，导致循环
  return count.get() * 2;
});

// ✅ 解决：Computed 应该是纯函数
const doubled = computed(() => {
  return count.get() * 2;
});


// ❌ 问题 3: 循环依赖
const a = computed(() => b.get());
const b = computed(() => a.get()); // 互相依赖

// ✅ 解决：重构为单向数据流
const base = signal(0);
const a = computed(() => base.get());
const b = computed(() => a.get() * 2);
```

---

## 计算属性问题

### 问题 3: Computed 不更新

**症状**: 依赖的信号已更新，但 computed 值不变

**可能原因**:
1. 依赖未正确追踪
2. 缓存未失效
3. 未在外部读取

**解决方案**:

```typescript
// ❌ 问题 1: 依赖未追踪
const obj = signal({ count: 0 });
const count = computed(() => {
  obj.get(); // 读取整个对象
  return obj.get().count;
});

obj.update(o => ({ ...o, count: 1 }));
console.log(count.get()); // 可能不更新

// ✅ 解决：精确追踪
const count = signal(0);
const doubled = computed(() => count.get() * 2);


// ❌ 问题 2: 从未调用 get()
const count = signal(0);
const doubled = computed(() => count.get() * 2);
// 从未读取 doubled，不会触发更新检查

// ✅ 解决：至少读取一次
console.log(doubled.get());


// ❌ 问题 3: 条件依赖
const flag = signal(true);
const a = signal(1);
const b = signal(2);

const result = computed(() => {
  return flag.get() ? a.get() : b.get(); // 动态依赖
});

flag.set(false);
a.set(100); // 不会触发 result 更新，因为当前依赖的是 b

// ✅ 解决：理解动态依赖特性
```

### 问题 4: Computed 性能差

**症状**: 应用运行缓慢，大量重复计算

**可能原因**:
1. 计算链过长
2. 频繁创建/销毁 computed
3. 不必要的复杂计算

**解决方案**:

```typescript
// ❌ 问题 1: 过长的计算链
const a = computed(() => input.get());
const b = computed(() => a.get());
const c = computed(() => b.get());
const d = computed(() => c.get());
const e = computed(() => d.get());

// ✅ 解决：扁平化
const result = computed(() => {
  const val = input.get();
  // 直接计算最终结果
  return val * 2 + 1;
});


// ❌ 问题 2: 在循环中创建 computed
for (let i = 0; i < 1000; i++) {
  computed(() => signals[i].get() * 2); // 创建 1000 个 computed
}

// ✅ 解决：复用或使用其他方式
const results = signals.map(s => computed(() => s.get() * 2));
// 或者在需要时才创建


// ❌ 问题 3: 复杂计算无缓存
const complex = computed(() => {
  return heavyComputation(data.get()); // 每次都执行
});

// ✅ 解决：利用 computed 缓存
// Computed 会自动缓存结果，只在依赖变化时重新计算
```

---

## Effect 副作用问题

### 问题 5: Effect 不执行

**症状**: effect 回调从未执行或只执行一次

**可能原因**:
1. 依赖的信号从未变化
2. Effect 被提前停止
3. 作用域已清理

**解决方案**:

```typescript
// ❌ 问题 1: 无依赖的 effect
const count = signal(0);
effect(() => {
  console.log('Fixed message'); // 不读取任何信号
});
// 只执行一次，因为没有依赖

// ✅ 解决：添加依赖
effect(() => {
  console.log(`Count: ${count.get()}`);
});


// ❌ 问题 2: 立即停止
const stop = effect(() => {
  console.log(count.get());
});
stop(); // 立即停止

count.set(1); // 不会触发

// ✅ 解决：在适当时机停止
// 在组件卸载或不再需要时调用 stop()


// ❌ 问题 3: 作用域已清理
const scope = effectScope(() => {
  effect(() => {
    console.log(count.get());
  });
});
scope.stop(); // 清理所有 effect

count.set(1); // 不会再执行

// ✅ 解决：确保作用域活跃
```

### 问题 6: Effect 执行次数过多

**症状**: effect 频繁执行，性能下降

**可能原因**:
1. 依赖了频繁变化的信号
2. 依赖链传递多次更新
3. 未使用 batch 批量更新

**解决方案**:

```typescript
// ❌ 问题 1: 依赖频繁变化的信号
const timer = signal(0);
setInterval(() => {
  timer.set(Date.now()); // 每秒更新
}, 1000);

effect(() => {
  console.log(timer.get()); // 每秒执行
});

// ✅ 解决：按需订阅或节流
let lastLogged = 0;
effect(() => {
  const now = timer.get();
  if (now - lastLogged > 5000) { // 每 5 秒记录一次
    console.log(now);
    lastLogged = now;
  }
});


// ❌ 问题 2: 多次单独更新
const a = signal(0);
const b = signal(0);

a.set(1); // 触发 effect
b.set(2); // 又触发 effect

// ✅ 解决：批量更新（需在 framework 中）
// batch(() => {
//   a.set(1);
//   b.set(2);
// }); // 只触发一次 effect
```

---

## 作用域管理问题

### 问题 7: 内存泄漏

**症状**: 应用运行时间越长越卡，内存占用持续增长

**可能原因**:
1. Effect 未清理
2. 定时器未清除
3. 事件监听器未移除

**解决方案**:

```typescript
// ❌ 问题 1: Effect 未清理
class MyComponent {
  setup() {
    effect(() => {
      console.log(count.get());
    });
    // 组件卸载后 effect 仍然存在
  }
}

// ✅ 解决：使用 effectScope
class MyComponent {
  private scope: (() => void) | null = null;
  
  setup() {
    this.scope = effectScope(() => {
      effect(() => {
        console.log(count.get());
      });
    });
  }
  
  destroy() {
    this.scope?.(); // 清理所有 effect
  }
}


// ❌ 问题 2: 定时器未清除
effectScope(() => {
  const timer = setInterval(() => {
    count.set(count.get() + 1);
  }, 1000);
  // 作用域停止后定时器仍在运行
});

// ✅ 解决：在清理函数中清除
effectScope(() => {
  const timer = setInterval(() => {
    count.set(count.get() + 1);
  }, 1000);
  
  // onScopeDispose(() => {
  //   clearInterval(timer);
  // });
});


// ❌ 问题 3: 事件监听器未移除
effectScope(() => {
  const handler = () => console.log('click');
  document.addEventListener('click', handler);
  // 永久监听
});

// ✅ 解决：清理监听器
effectScope(() => {
  const handler = () => console.log('click');
  document.addEventListener('click', handler);
  
  // onScopeDispose(() => {
  //   document.removeEventListener('click', handler);
  // });
});
```

---

## 性能问题

### 问题 8: 初始化缓慢

**症状**: 应用启动慢，创建大量信号耗时久

**可能原因**:
1. 一次性创建过多信号
2. 复杂的初始计算
3. 同步阻塞操作

**解决方案**:

```typescript
// ❌ 问题：阻塞式初始化
const signals = [];
for (let i = 0; i < 10000; i++) {
  signals.push(signal(expensiveInit(i))); // 同步执行
}

// ✅ 解决：分批或异步初始化
const signals = Array.from({ length: 10000 }, (_, i) => signal(i));
// @type-dom/signals 创建信号很快 (2.2ms/1000 个)

// 或者惰性初始化
const lazySignals = Array.from({ length: 10000 }, (_, i) => {
  let cached: any;
  let initialized = false;
  return signal(() => {
    if (!initialized) {
      cached = expensiveInit(i);
      initialized = true;
    }
    return cached;
  });
});
```

### 问题 9: 更新卡顿

**症状**: 数据更新时界面卡顿

**可能原因**:
1. 大量计算属性同时更新
2. 深度依赖链传播
3. 频繁 DOM 操作

**解决方案**:

```typescript
// ❌ 问题：连续单独更新
items.forEach((item, i) => {
  signals[i].set(item); // N 次更新 = N 次通知
});

// ✅ 解决：批量更新
// batch(() => {
//   items.forEach((item, i) => {
//     signals[i].set(item); // N 次更新 = 1 次通知
//   });
// });


// ❌ 问题：过度计算
const complex = computed(() => {
  return data.get().map(x => 
    x.items.map(y => 
      y.value * 2 + 1
    )
  ).flat(); // 复杂嵌套计算
});

// ✅ 解决：简化或缓存
const simple = computed(() => {
  const data = rawData.get();
  return processOnce(data); // 提取为独立函数
});
```

---

## 类型错误问题

### 问题 10: TypeScript 类型错误

**症状**: TS 编译错误或类型推断不正确

**常见场景**:

```typescript
// ❌ 问题 1: 泛型类型不匹配
const sig: Signal<number> = signal(); // 错误：undefined

// ✅ 解决：提供初始值或显式类型
const sig1 = signal(0); // 推断为 Signal<number>
const sig2: Signal<number | undefined> = signal();


// ❌ 问题 2: Computed 类型推断失败
const comp = computed(() => {
  if (condition) {
    return 'string';
  }
  return 123;
}); // 类型为 Signal<string | number>

// ✅ 解决：明确返回类型
const comp = computed<string | number>(() => {
  // ...
});


// ❌ 问题 3: Effect 清理函数类型
const stop = effect(() => {});
stop(); // ✅ 正确

const wrongStop: () => number = effect(() => {}); // ❌ 类型错误

// ✅ 解决：使用正确类型
const correctStop: () => void = effect(() => {});
```

---

## 🎯 调试技巧

### 技巧 1: 追踪 effect 执行

```typescript
let executionCount = 0;

effect(() => {
  executionCount++;
  console.log(`Effect executed ${executionCountCount} times`);
  console.log('Current value:', count.get());
});
```

### 技巧 2: 测量性能

```typescript
const start = performance.now();
count.set(newValue);
const end = performance.now();

console.log(`Update took: ${end - start}ms`);
console.log(`Executions: ${executionCount}`);
```

### 技巧 3: 可视化依赖关系

```typescript
// 手动追踪依赖链
const deps: string[] = [];

effect(() => {
  deps.length = 0;
  deps.push(`a: ${a.get()}`);
  deps.push(`b: ${b.get()}`);
  console.log('Dependencies:', deps);
});
```

---

## 📚 相关文档

- [`AI-README.md`](./AI-README.md) - Signals AI文档总索引
- [`SIGNALS-API-GUIDE.md`](./SIGNALS-API-GUIDE.md) - 完整 API 参考
- [`PERFORMANCE-GUIDE.md`](./PERFORMANCE-GUIDE.md) - 性能优化指南

---

**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License

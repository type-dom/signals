# TypeDOM Signals - 性能优化指南

> ⚡ **Push-Pull 模型性能完全指南**  
> 🚀 高性能响应式编程最佳实践

---

## 📖 概述

`@type-dom/signals` 基于先进的 **Push-Pull 模型**设计，提供卓越的响应式性能。本文档详细说明性能特性、优化策略和最佳实践。

### 核心性能优势

- ✅ **极低的初始化成本** - signal 创建仅需 2.20ms
- ✅ **高效的单元格计算** - cellx1000 全场景最优 (10.00ms)
- ✅ **智能依赖追踪** - 非递归更新逻辑
- ✅ **批量更新优化** - 合并多次变更减少通知次数

---

## 📊 性能基准测试

### 与其他框架对比

| 测试项 | @type-dom/signals | 最优框架 | 最差框架 | 排名 |
|--------|-------------------|----------|----------|------|
| **createSignals** | 2.20ms | 2.00ms (Svelte v5) | 93.00ms (x-reactivity) | #2 |
| **cellx1000** | 10.00ms | 10.00ms (自身) | 61.30ms (s-js) | **#1** |
| **updateSignals** | 819.00ms | 585.10ms (Alien Signals) | 1963.70ms (x-reactivity) | 中等 |
| **molBench** | 616.20ms | 605.50ms (Alien Signals) | 1331.10ms (Vue) | #2 |
| **avoidablePropagation** | 168.00ms | - | 439.80ms (Vue) | 优秀 |
| **deepPropagation** | 115.30ms | - | 247.60ms (Vue) | 优秀 |

### 性能特点分析

#### 1. 极快的信号初始化 ⭐⭐⭐⭐⭐

```typescript
// ✅ 优秀：快速创建大量信号
const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
// 创建 1000 个信号仅耗时约 2.2ms

// 适用场景：
// - 快速启动的轻量级应用
// - 频繁创建/销毁信号的场景
// - 大型表格/网格数据初始化
```

#### 2. 卓越的单元格计算能力 ⭐⭐⭐⭐⭐

```typescript
// ✅ 优秀：密集计算场景
const src = signal(0);
const computations = Array.from({ length: 1000 }, () => 
  computed(() => src.get()! % 2)
);

// 1000 个计算属性仍能保持最优性能
```

#### 3. 中等的更新性能 ⭐⭐⭐

```typescript
// ⚠️ 注意：高频更新场景需优化
const count = signal(0);

// ❌ 不推荐：短时间内大量单独更新
for (let i = 0; i < 1000; i++) {
  count.set(i); // 每次都会触发更新
}

// ✅ 推荐：批量更新（需在 framework 中使用 batch）
// batch(() => {
//   for (let i = 0; i < 1000; i++) {
//     count.set(i); // 只触发一次通知
//   }
// });
```

---

## 🎯 性能优化策略

### 策略 1: 减少不必要的计算属性

```typescript
// ❌ 不推荐：过度使用 computed
const a = signal(0);
const b = computed(() => a.get());
const c = computed(() => b.get());
const d = computed(() => c.get());
const result = computed(() => d.get());

// ✅ 推荐：简化计算链
const a = signal(0);
const result = computed(() => a.get());
```

### 策略 2: 精确追踪依赖

```typescript
// ❌ 不推荐：追踪整个对象
const store = signal({ count: 0, name: 'test' });
effect(() => {
  const all = store.get(); // 追踪整个对象
  console.log(all.count);
});

// ✅ 推荐：精确追踪需要的属性
const count = signal(0);
const name = signal('test');
effect(() => {
  console.log(count.get()); // 只追踪 count
});
```

### 策略 3: 合理使用 effectScope

```typescript
// ✅ 推荐：及时清理不再需要的副作用
const scope = effectScope(() => {
  const timer = setInterval(() => {
    count.set(count.get() + 1);
  }, 1000);
  
  // 在组件卸载时清理
  // onScopeDispose(() => {
  //   clearInterval(timer);
  //   scope.stop();
  // });
});

// 当不再需要时
scope.stop(); // 停止所有副作用
```

### 策略 4: 避免循环依赖

```typescript
// ❌ 错误：循环依赖导致性能问题
const a = computed(() => b.get());
const b = computed(() => a.get()); // 无限循环！

// ✅ 正确：单向数据流
const a = signal(0);
const b = computed(() => a.get() * 2);
const c = computed(() => b.get() + 1);
```

---

## 🔧 高级优化技巧

### 1. 惰性计算优化

```typescript
// Computed 默认惰性求值
const expensive = computed(() => {
  // 昂贵计算只在首次 get() 或依赖变化时执行
  return heavyComputation();
});

// 不调用 get() 不会执行计算
// console.log(expensive.get()); // 才会触发计算
```

### 2. 缓存利用

```typescript
// ✅ Computed 自动缓存结果
const count = signal(0);
const double = computed(() => count.get() * 2);

// 第一次调用 get() - 执行计算
console.log(double.get());

// 第二次调用 get() - 返回缓存值（如果 count 未变）
console.log(double.get());

// count 变化后再次调用 - 重新计算并缓存
count.set(5);
console.log(double.get());
```

### 3. 条件更新优化

```typescript
// ✅ 相同值不会触发更新
const count = signal(0);
count.set(0); // 值相同，不会触发通知

// ✅ 对象/数组引用变化会触发更新
const items = signal([1, 2, 3]);
items.set([...items.get(), 4]); // ✅ 新数组，触发更新
// items.get().push(4); // ❌ 同一引用，不会触发更新
```

---

## 📈 性能监控与调试

### 1. 追踪计算次数

```typescript
let computationCount = 0;

const count = signal(0);
const double = computed(() => {
  computationCount++;
  return count.get() * 2;
});

console.log(`Initial computations: ${computationCount}`); // 0

double.get();
console.log(`After first get: ${computationCount}`); // 1

double.get();
console.log(`After second get: ${computationCount}`); // 1 (缓存)

count.set(5);
double.get();
console.log(`After update: ${computationCount}`); // 2
```

### 2. 测量更新时间

```typescript
const start = performance.now();
count.set(100);
const end = performance.now();

console.log(`Update took: ${end - start}ms`);
```

### 3. 检查依赖链

```typescript
// 使用 effect 观察依赖关系
const logs: string[] = [];

effect(() => {
  logs.push(`count: ${count.get()}, double: ${double.get()}`);
});

count.set(1);
count.set(2);

console.log(logs); 
// ["count: 0, double: 0", "count: 1, double: 2", "count: 2, double: 4"]
```

---

## 🎓 最佳实践总结

### DO ✅

1. **优先使用 signal 和 computed**
   - 基础状态用 signal
   - 派生状态用 computed（自动缓存）

2. **精确追踪依赖**
   - 只订阅需要的数据
   - 避免订阅整个大对象

3. **及时清理副作用**
   - 使用 effectScope 管理生命周期
   - 组件卸载时调用 stop()

4. **利用惰性求值**
   - computed 只在需要时计算
   - 避免预计算不必要的值

### DON'T ❌

1. **不要在 effect 中执行异步操作**
   ```typescript
   // ❌ 错误
   effect(async () => {
     const data = await fetchData();
   });
   
   // ✅ 正确
   const data = signal(null);
   effect(() => {
     fetchData().then(d => data.set(d));
   });
   ```

2. **不要直接修改对象/数组**
   ```typescript
   // ❌ 错误
   const obj = signal({ count: 0 });
   obj.get().count++; // 不会触发更新
   
   // ✅ 正确
   obj.update(o => ({ ...o, count: o.count + 1 }));
   ```

3. **不要创建过长的计算链**
   ```typescript
   // ❌ 不推荐
   const a = computed(() => b.get());
   const b = computed(() => c.get());
   const c = computed(() => d.get());
   const d = computed(() => e.get());
   const e = computed(() => f.get());
   
   // ✅ 推荐：扁平化结构
   const base = signal(0);
   const result = computed(() => {
     // 直接基于 base 计算
     return base.get() * 2;
   });
   ```

---

## 📚 相关文档

### 本项目文档
- [`AI-README.md`](./AI-README.md) - Signals AI文档总索引
- [`SIGNALS-API-GUIDE.md`](./SIGNALS-API-GUIDE.md) - 完整 API 参考

### 相关库文档
- [Framework 文档](../../framework/AI-DOCS/AI-README.md) - 包含 batch 批量更新指南
- [Hooks 文档](../../hooks/AI-DOCS/AI-README.md) - Hooks 函数使用

### 外部资源
- [Alien Signals](https://github.com/transitive-bullshit/alien-signals) - Push-Pull 模型参考
- [TC39 Signals Proposal](https://github.com/tc39/proposal-signals) - Signals 标准提案

---

**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License

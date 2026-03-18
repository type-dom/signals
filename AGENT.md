# TypeDom Signals - Agent 文档

## 项目概述

TypeDom Signals 是一个高性能的响应式信号库，专为 TypeDom 框架设计的状态管理和数据绑定解决方案。基于 Push-Pull 模型实现，优化了内存占用和执行效率。

### 核心特性

- **高性能设计**：基于 Push-Pull 模型，非递归更新逻辑
- **轻量灵活**：TypeScript 编写，模块化设计
- **开发者友好**：直观的 API（signal, computed, effect）
- **作用域管理**：支持 effectScope，方便清理副作用

## 快速开始

### 安装

```bash
npm install @type-dom/signals
```

### 基本用法

```typescript
import { signal, computed, effect } from '@type-dom/signals';

// 创建基础信号
const count = signal(1);

// 创建计算属性
const doubleCount = computed(() => count.get() * 2);

// 创建副作用
effect(() => {
  console.log(`Count is: ${count.get()}`);
}); // Console: Count is: 1

console.log(doubleCount.get()); // 2

count.set(2); // Console: Count is: 2
```

## 核心架构

### 1. 响应式系统核心 (system.ts)

#### ReactiveNode 接口
所有响应式对象的基础接口：

```typescript
interface ReactiveNode {
  deps?: Link;      // 依赖链接
  depsTail?: Link;  // 依赖尾链接
  subs?: Link;      // 订阅链接
  subsTail?: Link;  // 订阅尾链接
  flags: ReactiveFlags; // 状态标志
}
```

#### ReactiveFlags 枚举

```typescript
enum ReactiveFlags {
  None = 0,           // 无状态
  Mutable = 1 << 0,   // 可变状态
  Watching = 1 << 1,  // 监听状态
  RecursedCheck = 1 << 2,
  Recursed = 1 << 3,
  Dirty = 1 << 4,     // 脏标记（需要更新）
  Pending = 1 << 5,   // 待处理
}
```

#### Link 结构

双向链表节点，连接依赖和订阅：

```typescript
interface Link {
  dep: ReactiveNode;
  sub: ReactiveNode;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}
```

### 2. 核心类实现

#### Signal<T> - 基础信号

可读写的基本信号类型：

```typescript
export class Signal<T = unknown> implements ISignal<T> {
  previousValue: T | undefined;
  value: T | undefined;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;

  get() { /* 获取值并进行依赖追踪 */ }
  set(value: T) { /* 设置新值并触发更新 */ }
  notify() { /* 通知所有订阅者 */ }
}
```

#### Computed<T> - 计算属性

基于其他信号的计算属性，自动缓存结果：

```typescript
export class Computed<T> implements IComputed<T> {
  value: T | undefined;
  getter: (previousValue?: any) => T;
  setter?: (newValue: any) => void;

  get() { /* 惰性求值，仅在脏标记时重新计算 */ }
  set(value: any) { /* 可选的 setter */ }
  notify() { /* 标记为脏并传播更新 */ }
}
```

## 核心算法

### 1. 依赖追踪机制

当 `effect()` 执行时：
1. 通过 `setCurrentSub(e)` 设置当前活动的订阅者
2. effect 函数内访问 `signal.get()` 时，会自动建立依赖关系
3. 通过 `link(dep, sub)` 创建双向链接

```typescript
export function effect(fn: () => void): () => void {
  const e: IEffect = {
    fn,
    subs: undefined,
    deps: undefined,
    flags: 2 satisfies ReactiveFlags.Watching,
  };
  
  if (activeSub !== undefined) {
    link(e, activeSub);
  } else if (activeScope !== undefined) {
    link(e, activeScope);
  }
  
  const prev = setCurrentSub(e);
  try {
    e.fn(); // 执行时会访问 signal.get()，从而建立依赖关系
  } finally {
    setCurrentSub(prev);
  }
  return effectOper.bind(e);
}
```

### 2. 更新传播流程（Push-Pull 模型）

**Push 阶段**：当 `signal.set()` 被调用时
1. 标记为 `Dirty | Mutable`
2. 调用 `propagate(subs)` 沿订阅链向下传播
3. 将受影响的节点标记为 `Pending`

**Pull 阶段**：当访问 `computed.get()` 时
1. 检查是否有 `Dirty` 或 `Pending` 标记
2. 调用 `checkDirty()` 验证依赖是否真的变化
3. 仅当值真正变化时才更新

### 3. propagate 函数（非递归实现）

使用栈结构替代递归，避免调用栈溢出：

```typescript
function propagate(link: Link): void {
  let next = link.nextSub;
  let stack: Stack<Link | undefined> | undefined;

  top: do {
    const sub = link.sub;
    let flags = sub.flags;

    if (flags & (Mutable | Watching)) {
      // 根据当前状态决定如何标记
      if (!(flags & (RecursedCheck | Recursed | Dirty | Pending))) {
        sub.flags = flags | Pending;
      } else if (!(flags & (RecursedCheck | Recursed))) {
        flags = None;
      }
      // ... 复杂的状态判断逻辑
      
      if (flags & Watching) {
        notify(sub);
      }

      if (flags & Mutable) {
        const subSubs = sub.subs;
        if (subSubs !== undefined) {
          link = subSubs;
          if (subSubs.nextSub !== undefined) {
            stack = { value: next, prev: stack };
            next = link.nextSub;
          }
          continue;
        }
      }
    }

    // 回溯逻辑
    if ((link = next!) !== undefined) {
      next = link.nextSub;
      continue;
    }

    while (stack !== undefined) {
      link = stack.value!;
      stack = stack.prev;
      if (link !== undefined) {
        next = link.nextSub;
        continue top;
      }
    }
    break;
  } while (true);
}
```

### 4. checkDirty 函数

验证计算属性是否需要重新计算：

```typescript
function checkDirty(link: Link, sub: ReactiveNode): boolean {
  let stack: Stack<Link> | undefined;
  let checkDepth = 0;

  top: do {
    const dep = link.dep;
    const depFlags = dep.flags;

    if (sub.flags & Dirty) {
      return true;
    } else if ((depFlags & (Mutable | Dirty)) === (Mutable | Dirty)) {
      if (update(dep)) {
        shallowPropagate(dep.subs!);
        return true;
      }
    } else if ((depFlags & (Mutable | Pending)) === (Mutable | Pending)) {
      if (checkDirty(dep.deps!, dep)) {
        if (update(dep)) {
          shallowPropagate(dep.subs!);
          return true;
        }
      } else {
        dep.flags = depFlags & ~Pending;
      }
    }

    link = link.nextDep!;
  } while (link !== undefined);

  return false;
}
```

## 公共 API

### 核心 API

#### signal<T>(initialValue?: T): Signal<T>

创建可读写信号：

```typescript
const count = signal(0);
count.get(); // 读取
count.set(1); // 写入
```

#### computed<T>(getter, setter?): Computed<T>

创建计算属性：

```typescript
const doubleCount = computed(() => count.get() * 2);

// 可写计算属性
const writable = computed(
  () => count.get(),
  (val) => count.set(val)
);
```

#### effect(fn: () => void): () => void

创建副作用：

```typescript
const dispose = effect(() => {
  console.log(count.get());
});
dispose(); // 清理副作用
```

#### effectScope(fn: () => void): () => void

创建作用域：

```typescript
const stop = effectScope(() => {
  effect(() => { 
    console.log(count.get());
  });
});
stop(); // 停止所有副作用
```

### 批量操作

```typescript
startBatch();
count.set(1);
double.set(2);
endBatch(); // 统一触发更新
```

### 上下文控制

```typescript
// 获取/设置当前订阅者
getCurrentSub();
setCurrentSub(sub);

// 获取/设置当前作用域
getCurrentScope();
setCurrentScope(scope);

// 暂停/恢复追踪（已废弃，推荐用 setCurrentSub）
pauseTracking();
resumeTracking();

// 现代方式
const paused = setCurrentSub(undefined);
// ... 不追踪的操作
setCurrentSub(paused);
```

### Ref 工具 (lib/ref.ts)

```typescript
// 判断是否为 Ref
isRef(value); // boolean

// 解包 Ref
unref(maybeRef); // T

// 转换为 Ref
toRef(value); // Ref<T>
toRef(object, 'key'); // Ref<T[K]>

// 批量转换
toRefs(object); // ToRefs<T>
toSignals(object); // ToSignals<T>

// 提取原始值
toRaw(ref); // T
```

### Watch 功能 (lib/watch.ts)

```typescript
watch(
  () => count.get(),           // 数据源
  (newVal, oldVal) => {        // 回调
    console.log('changed:', newVal);
  },
  {
    immediate: true,           // 立即执行一次
    deep: true,                // 深度监听
    once: false,               // 只执行一次
    flush: 'post',             // 刷新时机：'pre' | 'post' | 'sync'
    onError: (err) => {},      // 错误处理
    scheduler: (fn) => {}      // 自定义调度器
  }
);

reaction(
  () => data.get(),            // 数据函数
  (newVal, oldVal) => {},      // 效果函数
  options                      // 选项
);
```

## 使用场景

### 1. 基本状态管理

```typescript
import { signal, computed, effect } from '@type-dom/signals';

const state = signal({ count: 0, name: 'test' });
const doubled = computed(() => state.get().count * 2);

effect(() => {
  console.log(`Count: ${state.get().count}`);
});

state.set({ count: 1, name: 'updated' });
```

### 2. 组件内状态

```typescript
class Counter {
  private count = signal(0);
  
  setup() {
    effect(() => {
      this.render(this.count.get());
    });
  }
  
  increment() {
    this.count.set(this.count.get() + 1);
  }
}
```

### 3. 全局状态共享

```typescript
// store.ts
export const theme = signal<'dark' | 'light'>('light');

// component.ts
import { theme } from './store';
effect(() => {
  applyTheme(theme.get());
});
```

### 4. 作用域管理

```typescript
import { effectScope, onScopeDispose } from '@type-dom/signals';

const scope = effectScope(() => {
  const data = signal(fetchData());
  
  effect(() => {
    updateUI(data.get());
  });
  
  onScopeDispose(() => {
    cleanup();
  });
});

// 清理时
scope();
```

## 性能优化策略

### 1. 避免递归
- `propagate` 和 `checkDirty` 使用栈结构替代递归
- 减少调用栈开销，防止栈溢出

### 2. 惰性求值
- Computed 仅在真正访问 `.get()` 时才重新计算
- 通过 Dirty 和 Pending 标记避免不必要的计算

### 3. 批量更新
- 通过 `batchDepth` 控制更新时机
- 多次 set 操作合并为一次传播

### 4. 依赖图优化
- 双向链表存储依赖关系
- O(1) 时间复杂度的链接/ unlink 操作

### 5. V8 优化友好
- 类属性数量控制在 10 以内
- 避免动态添加属性
- 不使用 Map/Set 等复杂数据结构

## 注意事项

### 1. 引用类型处理

```typescript
const obj = signal({ a: 1 });
obj.get().a = 2; // ❌ 不会触发更新
obj.set({ ...obj.get(), a: 2 }); // ✅ 正确
```

### 2. 数组更新

```typescript
const arr = signal([1, 2, 3]);
arr.get().push(4); // ⚠️ 会触发更新（特殊处理）
arr.set([...arr.get(), 4]); // ✅ 推荐方式
```

### 3. 循环依赖

系统会自动检测并处理循环依赖，通过 `Recursed` 和 `RecursedCheck` 标记避免无限循环。

### 4. 内存泄漏预防

- 及时调用 effect 返回的清理函数
- 使用 effectScope 管理生命周期
- 避免在 effect 中创建未清理的副作用

## 开发指南

### 构建命令

```bash
npm run build          # 生产构建
npm run watch          # 监听模式
npm run test           # 运行测试
npm run test:coverage  # 测试覆盖率
npm run lint           # ESLint 检查
npm run format         # Prettier 格式化
```

### 项目结构

```
signals/
├── src/
│   ├── index.ts       # 主入口
│   ├── system.ts      # 核心响应式系统
│   └── lib/
│       ├── index.ts   # 工具导出
│       ├── ref.ts     # Ref 工具
│       ├── watch.ts   # Watch 功能
│       └── reaction.ts # Reaction 功能
├── tests/             # 测试文件
├── package.json       # 项目配置
└── tsconfig.json      # TypeScript 配置
```

### 技术栈

- **语言**: TypeScript 5.7+
- **构建工具**: Rollup 4.x
- **测试框架**: Vitest 3.x
- **代码规范**: ESLint 9.x + Prettier 3.x
- **依赖**: lodash-es

### 测试要点

- 基本信号读写
- 计算属性缓存
- 副作用追踪
- 作用域管理
- 复杂依赖拓扑
- 边界情况（undefined/null/对象/数组）

## 与 Vue Reactivity 对比

| 特性 | TypeDom Signals | Vue Reactivity |
|------|----------------|----------------|
| 模型 | Push-Pull | Proxy + Getter/Setter |
| 更新策略 | 惰性 + 批量 | 同步 + 异步队列 |
| 依赖追踪 | 显式 get/set | 自动追踪 |
| 计算属性缓存 | 手动 .get() | 自动缓存 |
| 性能优化 | 非递归传播 | 调度器队列 |

## 未来规划

### TODO 项

1. 更好的引用类型支持（Map/Object 深度监听）
2. readonly 支持（目前未实现）
3. markRaw 支持（目前注释掉）
4. 更完善的类型推导
5. 性能基准测试工具

### 已知问题

1. 对象/数组的深层变化检测不完善
2. computed 的 setter 在某些边缘情况下行为不一致
3. watch 的 deep 选项实现不完整

## 参考资料

- [GitHub 仓库](https://github.com/type-dom/signals)
- [Alien Signals](https://github.com/transitive-bullshit/alien-signals) - Push-Pull 模型参考
- [官方文档](https://type-dom.github.io/signals)

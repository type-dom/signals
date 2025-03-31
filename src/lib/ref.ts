import { IPrimitive, isArray, isFunction, isObject } from '@type-dom/utils';
import { computed, Computed } from '../computed';
import { signal, Signal } from '../signal';

// If the type T accepts type "any", output type Y, otherwise output type N.
// https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

export type Ref<T = unknown> = Signal<T> | Computed<T>;

/**
 * Checks if a value is a ref object.
 *
 * @param r - The value to inspect.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isref}
 */
export function isRef<T>(r: unknown): r is Ref<T> {
  return  r instanceof Signal || r instanceof Computed ;
}
export function isSignal<T>(r: MaybeRef<T>): r is Signal<T> {
  return r instanceof Signal;
}
export function isComputed<T>(r: MaybeRef<T>): r is Computed<T> {
  return r instanceof Computed;
}
export type MaybeRef<T = unknown> = T | Ref<T>;
  // | ShallowRef<T>
  // | WritableComputedRef<T>
// export type MaybeRef<T = any> = T | Signal<T> | Computed; // todo optimize Computed不能加 T， 否则会报错

// export type MaybeRefOrGetter<T = any> = MaybeRef<T> | ComputedRef<T> | (() => T)
export type MaybeRefOrGetter<T = unknown> = T | Signal<T> | Computed<T> | (() => T) // todo optimize Computed不能加 T， 否则会报错

/**
 * Returns the inner value if the argument is a ref, otherwise return the
 * argument itself. This is a sugar function for
 * `val = isRef(val) ? val.value : val`.
 *
 * @example
 * ```js
 * function useFoo(x: number | Ref<number>) {
 *   const unwrapped = unref(x)
 *   // unwrapped is guaranteed to be number now
 * }
 * ```
 *
 * @param ref - Ref or plain value to be converted into the plain value.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#unref}
 */
export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? ref.get() : ref;
}
// export function unref<T>(ref: MaybeRef<T>): T {
//   if (isRef(ref)) {
//     return ref.get()
//   }
//   return ref as T;
//   //  数组/对象 在业务中自己处理
//   // if (isArray(ref)) {
//   //   const rawArr: any[] = []; // 不要破坏原始值
//   //   // todo slot 会为空
//   //   //     不变的化，class 类的监听，会改变 原始值，再次触发时会 effect 无法监听；
//   //   ref.forEach((r) => {
//   //     if (isRef(r)) {
//   //       rawArr.push(unref(r));
//   //     } else {
//   //       rawArr.push(unref(r));
//   //     }
//   //   });
//   //   return rawArr  as T;
//   // } else if (isObject(ref)) {
//   //   const record = {} as Record<string, unknown>;  // 不要破坏原始值
//   //   for (const key in ref) {
//   //     if (isRef(ref[key])) {
//   //       record[key] = unref(ref[key])
//   //     }
//   //   }
//   //   return record as T
//   // } else {
//   //   return ref as T
//   // }
// }


export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref<T>] ? T : Ref<T>>

export type ToSignal<T> = IfAny<T, Signal<T>, [T] extends [Signal] ? T : Signal<T>>
/**
 * Used to normalize values / refs / getters into refs.
 *
 * @example
 * ```js
 * // returns existing refs as-is
 * toRef(existingRef)
 *
 * // creates a ref that calls the getter on .value access
 * toRef(() => props.foo)
 *
 * // creates normal refs from non-function values
 * // equivalent to ref(1)
 * toRef(1)
 * ```
 *
 * Can also be used to create a ref for a property on a source reactive object.
 * The created ref is synced with its source property: mutating the source
 * property will update the ref, and vice-versa.
 *
 * @example
 * ```js
 * const state = reactive({
 *   foo: 1,
 *   bar: 2
 * })
 *
 * const fooRef = toRef(state, 'foo')
 *
 * // mutating the ref updates the original
 * fooRef.value++
 * console.log(state.foo) // 2
 *
 * // mutating the original also updates the ref
 * state.foo++
 * console.log(fooRef.value) // 3
 * ```
 *
 * @param source - A getter, an existing ref, a non-function value, or a
 *                 reactive object to create a property ref from.
 * @param [key] - (optional) Name of the property in the reactive object.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#toref}
 */
export function toRef<T>(
  value: T,
): T extends () => infer R
  ? Readonly<Ref<R>>
  : T extends Ref<T>
    ? T
    : Ref<T>
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
): ToRef<T[K]>
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
  defaultValue: T[K],
): ToRef<Exclude<T[K], undefined>>

export function toRef(
  source: Record<string, any> | MaybeRef,
  key?: string,
  defaultValue?: unknown,
): Ref<any> {
  if (isRef(source)) {
    return source
  } else if (isFunction(source)) {
    // return new GetterRefImpl(source) as any
    return computed(source);
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key!, defaultValue)
  } else {
    return signal(source)
  }
}

function propertyToRef(
  source: Record<string, any>,
  key: string,
  defaultValue?: unknown,
) {
  const val = source[key]
  return isRef(val)
    ? val
    : signal(val ?? defaultValue)
}

function propertyToSignal(
  source: Record<string, IPrimitive | IPrimitive[]>,
  key: string,
  defaultValue?: unknown,
) {
  const val = source[key]
  return signal(val ?? defaultValue)
}

export type ToSignals<T = any> = {
  [K in keyof T]: ToSignal<T[K]>
}

export type ToRefs<T = any> = {
  // [K in keyof T]: ToRef<T[K]>
  [K in keyof T]: T[K] extends Ref<T[K]> ? T[K] : Ref<T[K]>;
}
export const toSignal = propertyToSignal;

/**
 * Converts a reactive object to a plain object where each property of the
 * resulting object is a ref pointing to the corresponding property of the
 * original object. Each individual ref is created using {@link toRef()}.
 *
 * @param object - Reactive object to be made into an object of linked refs.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#torefs}
 */
export function toRefs<T extends object>(object: T): ToRefs<T> {
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}
export function toSignals<T extends Record<string, IPrimitive | IPrimitive[]>>(object: T): ToSignals<T> {
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToSignal(object, key)
  }
  return ret
}
/**
 * Returns the raw, original object of a Vue-created proxy.
 *
 * `toRaw()` can return the original object from proxies created by
 * {@link reactive()}, {@link readonly()}, {@link shallowReactive()} or
 * {@link shallowReadonly()}.
 *
 * This is an escape hatch that can be used to temporarily read without
 * incurring proxy access / tracking overhead or write without triggering
 * changes. It is **not** recommended to hold a persistent reference to the
 * original object. Use with caution.
 *
 * @example
 * ```js
 * const foo = {}
 * const reactiveFoo = reactive(foo)
 *
 * console.log(toRaw(reactiveFoo) === foo) // true
 * ```
 *
 * @param observed - The object for which the "raw" value is requested.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#toraw}
 *
 *
 * todo 深层的响应式数据无法转换
 *
 * @param observed - The object for which the "raw" value is requested.
 */
export function toRaw<T = any>(observed?: MaybeRef<T | undefined>): T {
  // computed 返回 false 时会死循环；
  // const raw = isRef(observed) && observed.get();
  // if (isArray(observed)) {
  //   observed.map((r) => {
  //     if (isRef(r)) {
  //       return toRaw(r.get());
  //     }
  //     return r;
  //   });
  // } else if (isObject(observed)) {
  //   for (const key in observed) {
  //     if (isRef(observed[key] as any)) {
  //       (observed as any)[key] = toRaw(observed[key]?.get());
  //     }
  //   }
  // }
  // computed 返回 false 时会死循环；
  // return raw ? toRaw(raw) : observed as T;
  if (isRef(observed)) {
    return toRaw(observed.get()); // 递归求原数据
  } else {
    return observed as T;
  }
}


// type Primitive = string | number | boolean | bigint | symbol | undefined | null
// export type Builtin = Primitive | Function | Date | Error | RegExp
// export type DeepReadonly<T> = T extends Builtin
//   ? T
//   : T extends Map<infer K, infer V>
//     ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
//     : T extends ReadonlyMap<infer K, infer V>
//       ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
//       : T extends WeakMap<infer K, infer V>
//         ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
//         : T extends Set<infer U>
//           ? ReadonlySet<DeepReadonly<U>>
//           : T extends ReadonlySet<infer U>
//             ? ReadonlySet<DeepReadonly<U>>
//             : T extends WeakSet<infer U>
//               ? WeakSet<DeepReadonly<U>>
//               : T extends Promise<infer U>
//                 ? Promise<DeepReadonly<U>>
//                 : T extends Ref<infer U, unknown>
//                   ? Readonly<Ref<DeepReadonly<U>>>
//                   : T extends {}
//                     ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
//                     : Readonly<T>

/**
 * This is a special exported interface for other packages to declare
 * additional types that should bail out for ref unwrapping. For example
 * \@vue/runtime-dom can declare it like so in its d.ts:
 *
 * ``` ts
 * declare module '@vue/reactivity' {
 *   export interface RefUnwrapBailTypes {
 *     runtimeDOMBailTypes: Node | Window
 *   }
 * }
 * ```
 */
// export interface RefUnwrapBailTypes {/*nothing*/}

export declare const RawSymbol: unique symbol

export declare const ShallowReactiveMarker: unique symbol

// export type UnwrapRef<T> =
//   T extends ShallowRef<infer V, unknown>
//     ? V
//     : T extends Ref<infer V, unknown>
//       ? UnwrapRefSimple<V>
//       : UnwrapRefSimple<T>

// export type UnwrapRefSimple<T> = T extends
//   | Builtin
//   | Ref
//   // | RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
//   | { [RawSymbol]?: true }
//   ? T
//   : T extends Map<infer K, infer V>
//     ? Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Map<any, any>>>
//     : T extends WeakMap<infer K, infer V>
//       ? WeakMap<K, UnwrapRefSimple<V>> &
//       UnwrapRef<Omit<T, keyof WeakMap<any, any>>>
//       : T extends Set<infer V>
//         ? Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Set<any>>>
//         : T extends WeakSet<infer V>
//           ? WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakSet<any>>>
//           : T extends ReadonlyArray<any>
//             ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
//             : T extends object & { [ShallowReactiveMarker]?: never }
//               ? {
//                 [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>
//               }
//               : T
//
// // only unwrap nested ref
// export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>


/**
 * Takes an object (reactive or plain) or a ref and returns a readonly proxy to
 * the original.
 *
 * A readonly proxy is deep: any nested property accessed will be readonly as
 * well. It also has the same ref-unwrapping behavior as {@link reactive()},
 * except the unwrapped values will also be made readonly.
 *
 * @example
 * ```js
 * const original = reactive({ count: 0 })
 *
 * const copy = readonly(original)
 *
 * watchEffect(() => {
 *   // works for reactivity tracking
 *   console.log(copy.count)
 * })
 *
 * // mutating original will trigger watchers relying on the copy
 * original.count++
 *
 * // mutating the copy will fail and result in a warning
 * copy.count++ // warning!
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-core.html#readonly}
 */
export function readonly<T extends object>(
  target: T,
): T {
  // return createReactiveObject(
  //   target,
  //   true,
  //   readonlyHandlers,
  //   readonlyCollectionHandlers,
  //   readonlyMap,
  // )
  // todo 暂时不用
  return target;
}

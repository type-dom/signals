import { test } from 'vitest';
import { computed, signal, watch } from '../dist';

test('watch 监听', () => {
  console.error('test signals . ');
  // const src = signal(0);
  // const c1 = computed(() => src.get() * 2);
  // const c2 = computed(() => c1.get());
  // const c3 = computed(() => c2.get());
  //
  // c3.get();
  // src.set(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
  // c2.get(); // c1 -> none, c2 -> none
  // src.set(3); // c1 -> dirty, c2 -> toCheckDirty
  //
  // const src1 = signal(0);
  // const src2 = signal(0);
  // const order: string[] = [];
  // console.warn('then effect . ');
  // effect(() => {
  //   order.push('a');
  //   pauseTracking();
  //   const isOne = src2.get() === 1;
  //   resumeTracking();
  //   if (isOne) {
  //     src1.get();
  //   }
  //   src2.get();
  //   src1.get();
  // });
  // console.warn('after effect . ');
  // effect(() => {
  //   console.warn('effect . ');
  //   order.push('b');
  //   src1.get();
  // });
  // src2.set(1); // src1.subs: a -> b -> a
  //
  // order.length = 0;
  // src1.set(src1.get() + 1);

  const map = new Map<number, number>()
  const a = signal(map);
  const b = signal(0);
  const c = computed(() => {
    console.log('computed , a is ', a);
    return a.get().size + b.get();
  });
  watch(() => c.get(), (newVal) => {
    console.warn('newVal is ', newVal);
  });
  map.set(0, 0);
  a.get().set(1, 1);
  a.get();
  a.set(a.get());
  // b.set(1);
  a.set(new Map(a.get()));
});

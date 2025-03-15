// import { Computed } from '../computed';
// import { endTracking, IDependency, link, shallowPropagate, startTracking, SubscriberFlags } from '../system';
// import { asyncCheckDirty } from './asyncSystem';
//
// export function asyncComputed<T>(getter: (cachedValue?: T) => AsyncGenerator<IDependency, T>): AsyncComputed<T> {
// 	return new AsyncComputed<T>(getter);
// }
//
// export class AsyncComputed<T = any> extends Computed {
//   override async get(): Promise<T> {
//     const flags = this.flags;
//     if (flags & SubscriberFlags.Dirty) {
//       if (await this.update()) {
//         const subs = this.subs;
//         if (subs !== undefined) {
//           shallowPropagate(subs);
//         }
//       }
//     } else if (flags & SubscriberFlags.ToCheckDirty) {
//       if (await asyncCheckDirty(this.deps!)) {
//         if (await this.update()) {
//           const subs = this.subs;
//           if (subs !== undefined) {
//             shallowPropagate(subs);
//           }
//         }
//       } else {
//         this.flags = flags & ~SubscriberFlags.ToCheckDirty;
//       }
//     }
//     return this.currentValue!;
//   }
//
//   // @ts-ignore
//   override async update(): Promise<boolean> {
//     try {
//       startTracking(this);
//       const oldValue = this.currentValue;
//       const generator = this.getter(oldValue);
//       let current = await generator.next();
//       while (!current.done) {
//         const dep = current.value;
//         link(dep, this);
//         current = await generator.next();
//       }
//       const newValue = await current.value;
//       if (oldValue !== newValue) {
//         this.currentValue = newValue;
//         return true;
//       }
//       return false;
//     } finally {
//       endTracking(this);
//     }
//   }
// }

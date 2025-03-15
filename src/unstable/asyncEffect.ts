// import { Effect } from '../effect';
// import { endTracking, link, startTracking, SubscriberFlags, IDependency } from '../system';
// import { asyncCheckDirty } from './asyncSystem';
//
// export function asyncEffect<T>(fn: () => AsyncGenerator<IDependency, T>): AsyncEffect<T> {
// 	const e = new AsyncEffect(fn);
// 	e.run();
// 	return e;
// }
//
// export class AsyncEffect<T = any> extends Effect {
//   override async notify(): Promise<void> {
//     let flags = this.flags;
//     if (flags & SubscriberFlags.Dirty) {
//       this.run();
//       return;
//     }
//     if (flags & SubscriberFlags.ToCheckDirty) {
//       if (await asyncCheckDirty(this.deps!)) {
//         this.run();
//         return;
//       } else {
//         this.flags = flags &= ~SubscriberFlags.ToCheckDirty;
//       }
//     }
//     if (flags & SubscriberFlags.InnerEffectsPending) {
//       this.flags = flags & ~SubscriberFlags.InnerEffectsPending;
//       let link = this.deps!;
//       do {
//         const dep = link.dep;
//         if ('notify' in dep) {
//           dep.notify();
//         }
//         link = link.nextDep!;
//       } while (link !== undefined);
//     }
//   }
//
//   override async run(): Promise<T> {
//     try {
//       startTracking(this);
//       const generator = this.fn();
//       let current = await generator.next();
//       while (!current.done) {
//         const dep = current.value;
//         link(dep, this);
//         current = await generator.next();
//       }
//       return await current.value;
//     } finally {
//       endTracking(this);
//     }
//   }
// }

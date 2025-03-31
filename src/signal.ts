import { isArray, isBoolean, isNumber, isObject, isString, isUndefined } from '@type-dom/utils';
import { batchDepth } from './batch';
import { activeSub } from './effect';
import { IDependency, ILink, processEffectNotifications, link, propagate } from './system';

export function signal<T>(): Signal<T>;
export function signal<T>(oldValue: T): Signal<T>;
export function signal<T>(initialValue?: T): Signal<T> {
	return new Signal(initialValue);
}

export interface ISignal<T = unknown> extends IDependency {
	currentValue?: T;
}

export class Signal<T = unknown> implements ISignal<T> {
	currentValue?: T;
	// Dependency
	subs?: ILink ;
	subsTail?: ILink;

	constructor(initialValue?: T) {
		this.currentValue = initialValue;
		// this.subs = undefined;
		// this.subsTail = undefined;
		// if (oldValue !== undefined) {
		// 	this.set(oldValue);
		// }
	}

	get() {
		if (activeSub !== undefined) {
			link(this, activeSub);
		}
		return this.currentValue as T;
	}

	/**
	 * 设置值
	 * 如果值跟原来一样，不会触发更新
	 * todo: 优化，如果值是对象或数组这种引用类型，内部值可能变了，却没有触发更新
	 * 		触发更新的规则如何设定？？？
	 * @param value
	 */
	set(value: T): void {
		// console.warn('signal set value is ', value);
		if (this.currentValue !== (this.currentValue = value)) {
			this.notify();
		} else {
			if (isUndefined(value)) {
				// console.error('undefined same value, ', value);
			} else if (isString(value)) {
				// console.error('string same value, ', value);
			} else if (isNumber(value)) {
				// console.error('number same value, ', value);
			} else if (isBoolean(value)) {
				// console.error('boolean same value, ', value);
				// this.notify();
			} else if (isArray(value)) { // 数组的话，内部值可能变了，但是引用没变，所以触发更新
				// todo 是否需要深度比对 ？？？
				console.error('array, same value, ', value);
				this.notify();
			} else if (isObject(value)) { // 对象的话，内部值可能变了，但是引用没变，所以触发更新
				// todo 是否需要深度比对 ？？？
				this.notify();
				if (value instanceof Element) {
				// 	nothing
				} else if (value instanceof Map) {
					// console.error('Map same value, ', value);
				} else {
					// console.error('object same value, ', value);
				}
			} else {
				console.error('other type, same value, ', value, ' type is ', typeof value);
			}
		}
	}

	notify() {
		const subs = this.subs;
		if (subs !== undefined) {
			propagate(subs);
			if (!batchDepth) {
				processEffectNotifications();
			}
		}
	}
}

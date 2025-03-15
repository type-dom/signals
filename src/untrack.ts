import { ISubscriber } from './system';
import { activeSub, setActiveSub } from './effect';

const pauseStack: (ISubscriber | undefined)[] = [];

export function pauseTracking() {
  pauseStack.push(activeSub);
  // activeSub = undefined;
  setActiveSub(undefined);
}

export function resumeTracking() {
  // activeSub = pauseStack.pop();
  setActiveSub(pauseStack.pop())
}

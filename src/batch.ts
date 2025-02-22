import { drainQueuedEffects } from './system';

export let batchDepth = 0;

export function startBatch(): void {
	++batchDepth;
}

export function endBatch(): void {
	if (!--batchDepth) {
		drainQueuedEffects();
	}
}

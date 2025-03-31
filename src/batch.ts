import { processEffectNotifications } from './system';

export let batchDepth = 0;

//#region Public functions
export function startBatch(): void {
	++batchDepth;
}

export function endBatch(): void {
	if (!--batchDepth) {
		// drainQueuedEffects();
		processEffectNotifications();
	}
}

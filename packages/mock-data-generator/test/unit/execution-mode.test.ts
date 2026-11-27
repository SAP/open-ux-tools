import { actualExecutionMode } from '../../src/standalone.js';
import type { MockDataGeneratorResult } from '../../src/types.js';

function result(classifier: 'ready' | 'unavailable', sft: 'ready' | 'unavailable', acceptedSlots: number) {
    // Only the fields consumed by execution-mode classification are relevant to this focused contract test.
    return {
        capabilities: { classifier, sft },
        statistics: { sft: { eligibleSlots: 2, acceptedSlots } }
    } as MockDataGeneratorResult;
}

describe('run-level execution mode', () => {
    it('does not claim fully learned execution when classification degraded', () => {
        expect(actualExecutionMode(result('unavailable', 'ready', 2), 'auto')).toBe('hybrid');
    });

    it('distinguishes fully learned, partially learned and deterministic execution', () => {
        expect(actualExecutionMode(result('ready', 'ready', 2), 'auto')).toBe('learned');
        expect(actualExecutionMode(result('ready', 'ready', 1), 'auto')).toBe('hybrid');
        expect(actualExecutionMode(result('unavailable', 'unavailable', 0), 'auto')).toBe('deterministic');
        expect(actualExecutionMode(result('ready', 'ready', 2), 'deterministic')).toBe('deterministic');
    });
});

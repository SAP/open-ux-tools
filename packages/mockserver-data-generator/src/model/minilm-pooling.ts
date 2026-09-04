/**
 * Sentence-transformers mean pooling followed by L2 normalization.
 *
 * @param lastHiddenState
 * @param attentionMask
 * @param hiddenSize
 */
export function meanPoolAndNormalize(
    lastHiddenState: Float32Array,
    attentionMask: ReadonlyArray<number>,
    hiddenSize: number
): ReadonlyArray<number> {
    const sequenceLength = lastHiddenState.length / hiddenSize;
    if (!Number.isSafeInteger(hiddenSize) || hiddenSize <= 0 || sequenceLength !== attentionMask.length) {
        throw new TypeError('MiniLM output shape does not match its attention mask and hidden size');
    }
    const pooled = new Array<number>(hiddenSize).fill(0);
    let maskTotal = 0;
    for (let position = 0; position < sequenceLength; position += 1) {
        const mask = attentionMask[position] ?? 0;
        if (mask === 0) {
            continue;
        }
        maskTotal += mask;
        for (let dimension = 0; dimension < hiddenSize; dimension += 1) {
            pooled[dimension] += (lastHiddenState[position * hiddenSize + dimension] ?? 0) * mask;
        }
    }
    const denominator = Math.max(maskTotal, 1e-9);
    let squaredNorm = 0;
    for (let index = 0; index < pooled.length; index += 1) {
        pooled[index] /= denominator;
        squaredNorm += pooled[index] ** 2;
    }
    const norm = Math.max(Math.sqrt(squaredNorm), 1e-9);
    return Object.freeze(pooled.map((value) => value / norm));
}

function positiveInteger(value, label) {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(`${label} must be a positive integer`);
    }
    return value;
}

function positiveNumber(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new TypeError(`${label} must be positive`);
    }
    return value;
}

/**
 * Translate a retained pilot export config into the production runtime contract.
 *
 * @param {string} value serialized pilot configuration
 * @param {boolean} repositoryLayout whether the source is the original repository export
 * @returns {object} validated production generation configuration
 */
export function productionGenerationConfiguration(value, repositoryLayout) {
    const input = JSON.parse(value);
    const architecture = repositoryLayout
        ? {
              numHiddenLayers: input.num_hidden_layers,
              numKeyValueHeads: input.num_key_value_heads,
              hiddenSize: input.hidden_size,
              numAttentionHeads: input.num_attention_heads
          }
        : {
              numHiddenLayers: input.numHiddenLayers,
              numKeyValueHeads: input.numKeyValueHeads,
              hiddenSize: input.hiddenSize,
              numAttentionHeads: input.numAttentionHeads
          };
    const sampling = repositoryLayout
        ? {
              temperature: 0.6,
              topP: 0.9,
              repetitionPenalty: 1.15,
              noRepeatNgramSize: 4,
              maxNewTokens: 300
          }
        : input.samplingOptions;
    if (sampling === null || typeof sampling !== 'object' || Array.isArray(sampling)) {
        throw new TypeError('SFT sampling configuration must be an object');
    }
    return {
        numHiddenLayers: positiveInteger(architecture.numHiddenLayers, 'SFT hidden-layer count'),
        numKeyValueHeads: positiveInteger(architecture.numKeyValueHeads, 'SFT key/value-head count'),
        hiddenSize: positiveInteger(architecture.hiddenSize, 'SFT hidden size'),
        numAttentionHeads: positiveInteger(architecture.numAttentionHeads, 'SFT attention-head count'),
        samplingOptions: (() => {
            const topP = positiveNumber(sampling.topP, 'SFT topP');
            if (topP > 1) {
                throw new TypeError('SFT topP must not exceed 1');
            }
            if (!Number.isSafeInteger(sampling.noRepeatNgramSize) || sampling.noRepeatNgramSize < 0) {
                throw new TypeError('SFT no-repeat ngram size must be a non-negative integer');
            }
            return {
                temperature: positiveNumber(sampling.temperature, 'SFT temperature'),
                topP,
                repetitionPenalty: positiveNumber(sampling.repetitionPenalty, 'SFT repetition penalty'),
                noRepeatNgramSize: sampling.noRepeatNgramSize,
                maxNewTokens: positiveInteger(sampling.maxNewTokens, 'SFT token budget')
            };
        })()
    };
}

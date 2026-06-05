// Mock implementation of @huggingface/transformers
const createMockPipelineInstance = () => jest.fn().mockResolvedValue({
    data: new Float32Array(384).fill(0).map(() => Math.random() - 0.5) // MiniLM-L6-v2 dimensions
});

const pipeline = jest.fn(() => Promise.resolve(createMockPipelineInstance()));

const env = {
    localModelPath: '',
    allowRemoteModels: true,
    cacheDir: null
};

module.exports = {
    pipeline,
    env
};

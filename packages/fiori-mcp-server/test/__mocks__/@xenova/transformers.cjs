// Mock implementation of @xenova/transformers
const createMockPipelineInstance = () => jest.fn().mockResolvedValue({
    data: new Float32Array(384).fill(0).map(() => Math.random() - 0.5) // MiniLM-L6-v2 dimensions
});

const pipeline = jest.fn(() => Promise.resolve(createMockPipelineInstance()));

module.exports = {
    pipeline
};
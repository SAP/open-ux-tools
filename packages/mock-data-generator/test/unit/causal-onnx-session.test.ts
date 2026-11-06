import {
    causalIntraOpThreads,
    createCausalOnnxSession,
    type CausalOnnxBackend
} from '../../src/model/causal-onnx-session.js';

describe('causal ONNX session adapter', () => {
    test('marshals prefill/decode tensors and extracts final-position logits and KV output', async () => {
        const dispose = jest.fn(async () => undefined);
        const run = jest.fn(
            async (feeds: Readonly<Record<string, { data: BigInt64Array | Float32Array; dims: number[] }>>) => {
                expect(feeds.input_ids?.dims).toEqual([1, 2]);
                expect(feeds['past_key_values.0.key']?.dims).toEqual([1, 2, 0, 4]);
                return {
                    logits: {
                        data: Float32Array.from([1, 2, 3, 10, 20, 30]),
                        dims: [1, 2, 3]
                    },
                    'present.0.key': { data: Float32Array.of(1, 2), dims: [1, 2, 1, 1] },
                    'present.0.value': { data: Float32Array.of(3, 4), dims: [1, 2, 1, 1] }
                };
            }
        );
        const backend: CausalOnnxBackend = {
            createSession: jest.fn(async () => ({ run, dispose })),
            tensor: (_type, data, dims) => ({ data, dims: [...dims] })
        };
        const session = await createCausalOnnxSession({
            modelPath: '/verified-cache/sft/model.onnx',
            config: { numLayers: 1, numKeyValueHeads: 2, headDimension: 4 },
            backend
        });

        const output = await session.run({
            inputIds: Int32Array.of(7, 8),
            attentionMask: Int32Array.of(1, 1),
            positionIds: Int32Array.of(0, 1),
            pastKeyValues: new Map()
        });

        expect(output.lastLogits).toEqual(Float32Array.of(10, 20, 30));
        expect(output.presentKeyValues.get(0)?.key).toEqual(Float32Array.of(1, 2));
        await session.dispose?.();
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    test('rejects an ONNX graph missing required KV outputs', async () => {
        const backend: CausalOnnxBackend = {
            createSession: jest.fn(async () => ({
                run: jest.fn(async () => ({ logits: { data: Float32Array.of(1), dims: [1, 1, 1] } }))
            })),
            tensor: (_type, data, dims) => ({ data, dims: [...dims] })
        };
        const session = await createCausalOnnxSession({
            modelPath: '/verified-cache/sft/model.onnx',
            config: { numLayers: 1, numKeyValueHeads: 1, headDimension: 1 },
            backend
        });

        await expect(
            session.run({
                inputIds: Int32Array.of(1),
                attentionMask: Int32Array.of(1),
                positionIds: Int32Array.of(0),
                pastKeyValues: new Map()
            })
        ).rejects.toThrow(/present\.0/);
    });

    test("decodes several rows in one call and returns each row's last-position logits", async () => {
        const run = jest.fn(
            async (feeds: Readonly<Record<string, { data: BigInt64Array | Float32Array; dims: number[] }>>) => {
                expect(feeds.input_ids?.dims).toEqual([2, 1]);
                expect(feeds.attention_mask?.dims).toEqual([2, 4]);
                expect(feeds['past_key_values.0.key']?.dims).toEqual([2, 1, 3, 1]);
                return {
                    logits: { data: Float32Array.of(1, 2, 3, 4), dims: [2, 1, 2] },
                    'present.0.key': { data: new Float32Array(8), dims: [2, 1, 4, 1] },
                    'present.0.value': { data: new Float32Array(8), dims: [2, 1, 4, 1] }
                };
            }
        );
        const backend: CausalOnnxBackend = {
            createSession: jest.fn(async () => ({ run })),
            tensor: (_type, data, dims) => ({ data, dims: [...dims] })
        };
        const session = await createCausalOnnxSession({
            modelPath: '/verified-cache/sft/model.onnx',
            config: { numLayers: 1, numKeyValueHeads: 1, headDimension: 1 },
            backend
        });

        const output = await session.run({
            inputIds: Int32Array.of(5, 6),
            attentionMask: new Int32Array(8).fill(1),
            positionIds: Int32Array.of(3, 3),
            pastKeyValues: new Map([[0, { key: new Float32Array(6), value: new Float32Array(6) }]]),
            batchSize: 2
        });

        expect(output.lastLogits).toEqual(Float32Array.of(1, 2, 3, 4));
        await expect(
            session.run({
                inputIds: Int32Array.of(5, 6, 7),
                attentionMask: new Int32Array(8).fill(1),
                positionIds: Int32Array.of(3, 3, 3),
                pastKeyValues: new Map(),
                batchSize: 2
            })
        ).rejects.toThrow('batch size');
    });

    test('uses at most four native threads and never more than the available cores', () => {
        expect(causalIntraOpThreads(2)).toBe(2);
        expect(causalIntraOpThreads(12)).toBe(4);
        expect(causalIntraOpThreads(0)).toBe(1);
        expect(causalIntraOpThreads()).toBeGreaterThanOrEqual(1);
    });
});

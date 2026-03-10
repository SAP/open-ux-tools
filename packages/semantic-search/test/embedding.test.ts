import embedding from '../src/embedding';

jest.setTimeout(60000); // Increase timeout for async operations

describe('embedding', () => {
    it('should generate embeddings', async () => {
        const text = 'Hello world';
        const result = await embedding(text);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThan(0);

        // Check that embeddings are normalized (approximately unit length)
        let sum = 0;
        for (let i = 0; i < result.length; i++) {
            sum += result[i] * result[i];
        }
        const magnitude = Math.sqrt(sum);
        expect(Math.abs(magnitude - 1.0)).toBeLessThan(0.01);
    });

    it('should produce consistent embeddings', async () => {
        const text = 'Test text for consistency';
        const result1 = await embedding(text);
        const result2 = await embedding(text);

        expect(result1.length).toBe(result2.length);

        // Check if embeddings are identical (they should be for the same input)
        for (let i = 0; i < result1.length; i++) {
            expect(Math.abs(result1[i] - result2[i])).toBeLessThan(0.0001);
        }
    });

    it('should handle empty string', async () => {
        const result = await embedding('');
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThan(0);
    });

    it('should handle long text', async () => {
        const longText = 'This is a very long text. '.repeat(100);
        const result = await embedding(longText);
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
        const text = 'Hello! @#$%^&*() 你好 🎉';
        const result = await embedding(text);
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThan(0);
    });

    it('should handle text with control characters', async () => {
        const text = 'Text\x00with\x01control\x02chars';
        const result = await embedding(text);
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThan(0);
    });

    it('should handle text with lots of whitespace', async () => {
        const text = '   Hello     World   \n\n\t  Test   ';
        const result = await embedding(text);
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBeGreaterThan(0);
    });
});

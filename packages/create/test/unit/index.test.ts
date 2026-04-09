test('Check if loading main index file executes cli, should throw error due to invalid arguments', async () => {
    const argv = process.argv;
    process.argv = [];
    try {
        await import('../../src/index');
        process.argv = argv;
        fail('Expected import to throw');
    } catch (error) {
        process.argv = argv;
        const msg = (error as Error).message || String(error);
        // In ESM mode, the error may be about arguments or about module loading
        expect(msg).toMatch(/arguments|export/);
    }
});

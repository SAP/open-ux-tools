describe('Automatic Setup File', () => {
    it('will enhance store the require function', async () => {
        expect(global.requireFn).toBeUndefined();
        require('../src/automaticSetup');
        expect(global.requireFn).toBeDefined();
    });
});

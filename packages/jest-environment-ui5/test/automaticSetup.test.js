const path = require('path');

describe('Automatic Setup File', () => {
    it('will enhance the test function', async () => {
        expect(test.info).toBeUndefined();
        require('../src/automaticSetupAfterEnv');
        expect(test.info).toBeDefined();
        test.info().annotations.push({ type: 'references', ID: 'uxengtools-2' });
    });
    it('will enhance store the require function', async () => {
        expect(global.requireFn).toBeUndefined();
        require('../src/automaticSetup');
        expect(global.requireFn).toBeDefined();
    });
});

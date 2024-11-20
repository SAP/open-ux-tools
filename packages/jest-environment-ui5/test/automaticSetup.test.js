const path = require('path');
const {getTestMetadata} = require("../src/metadataExchange");
const fs = require("fs");

describe('Automatic Setup File', () => {
    it('will enhance the test function', async () => {
        fs.mkdirSync("reports");
        expect(test.info).toBeUndefined();
        require('../src/automaticSetupAfterEnv');
        expect(test.info).toBeDefined();
        test.info().annotations.push({ type: 'references', ID: 'uxengtools-2' });
        expect(getTestMetadata(expect.getState().currentTestName).annotations).toEqual([{ type: 'references', ID: 'uxengtools-2' }]);
        fs.rmSync("reports", {recursive: true});
    });
    it('will enhance store the require function', async () => {
        expect(global.requireFn).toBeUndefined();
        require('../src/automaticSetup');
        expect(global.requireFn).toBeDefined();
    });
});

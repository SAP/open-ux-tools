const jestCLI = require('jest');
describe('Custom environment', () => {
    it('Can be created', async () => {

        let failed = false
        try {
            await jestCLI.run("--detectOpenHandles --config jest-ui5.config.js", process.cwd());
        } catch (e) {
            failed = true;
        }
        expect(failed).toBe(false);


        // This is done centrally in the CustomEnvironment constructor but we need to call it here for the test purpose

    },60000);

    it('Can be created in 1.71', async () => {

        let failed = false
        try {
            await jestCLI.run("--detectOpenHandles --config jest-ui5-71.config.js", process.cwd());
        } catch (e) {
            failed = true;
        }
        expect(failed).toBe(false);


        // This is done centrally in the CustomEnvironment constructor but we need to call it here for the test purpose

    },60000);
});

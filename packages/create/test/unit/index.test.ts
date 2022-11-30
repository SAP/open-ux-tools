import { join } from 'path';

test('Check if loading main index file executes cli, should throw error due to invalid arguments', async () => {
    const argv = process.argv;
    process.argv = [];
    try {
        await import(join('../../src'));
        fail('Executing main index without arguments should have thrown error but did not');
    } catch (error: any) {
        expect(error.toString()).toContain('arguments');
    }
    process.argv = argv;
});

import { join } from 'node:path';

test('Check if loading main index file executes cli, should throw error due to invalid arguments', async () => {
    const argv = process.argv;
    process.argv = [];
    await expect(import(join('../../src'))).rejects.toThrow('arguments');
    process.argv = argv;
});

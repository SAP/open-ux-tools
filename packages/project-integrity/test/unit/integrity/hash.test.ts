import { getFileIntegrity } from '../../../src/integrity/hash.js';

test('Test getFileIntegrity()', async () => {
    expect.assertions(1);
    try {
        await getFileIntegrity(['non-existing-file', 'other-non-existing-file']);
    } catch (error) {
        expect(error.message).toBe('The following files do not exist: non-existing-file, other-non-existing-file');
    }
});

// Other export of hash.ts are already covered by test in project.test.ts

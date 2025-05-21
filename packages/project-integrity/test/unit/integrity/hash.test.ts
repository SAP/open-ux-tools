import { getFileIntegrity } from '../../../src/integrity/hash';

test('Test getFileIntegrity()', async () => {
    try {
        await getFileIntegrity(['non-existing-file', 'other-non-existing-file']);
        expect(false).toBe('Call to getFileIntegrity() should have thrown an error, but did not.');
    } catch (error) {
        expect(error.message).toBe('The following files do not exist: non-existing-file, other-non-existing-file');
    }
});

// Other export of hash.ts are already covered by test in project.test.ts

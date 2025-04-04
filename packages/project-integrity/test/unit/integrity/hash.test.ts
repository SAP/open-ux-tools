import { getFileIntegrity, getCsnIntegrity } from '../../../src/integrity/hash';

test('Test getFileIntegrity()', async () => {
    try {
        await getFileIntegrity(['non-existing-file', 'other-non-existing-file']);
        expect(false).toBe('Call to getFileIntegrity() should have thrown an error, but did not.');
    } catch (error) {
        expect(error.message).toBe('The following files do not exist: non-existing-file, other-non-existing-file');
    }
});

const csnContent = `
{
  "namespace": "test",
  "definitions": {
    "test.SalesData": {
      "kind": "entity",
      "elements": {}
    }
  }
}`;

test('Test getCsnIntegrity()', async () => {
    const hash = getCsnIntegrity(csnContent);
    expect(hash).toBe('0f9c3dac7d965cd9c5ad37d26fec632e');
});

// Other export of hash.ts are already covered by test in project.test.ts

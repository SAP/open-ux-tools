import { initI18n, t } from '../src/i18n';
import { YamlDocument } from '../src/yaml-document';

describe('YamlDocument', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('throws an error when instatiated with malformed YAML contents', async () => {
        const serializedYaml = `
foo:
  bar: 13
   baz: 14
  bar: 42
 `;
        expect(async () => await YamlDocument.newInstance(serializedYaml)).rejects.toThrow();
    });

    it('toString returns serialized contents, including comments', async () => {
        const serializedYaml = `# This is at the top

foo:
  - bar: 13 # bar
  - baz: 14 # baz
`;
        const doc = await YamlDocument.newInstance(serializedYaml);
        expect(doc.toString()).toEqual(serializedYaml);
    });

    describe('setIn', () => {
        it("throws an error when path is empty ('/')", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.setIn({ path: '/', value: 42 })).toThrow(t('error.pathCannotBeEmpty'));
        });

        it("throws an error when path is empty ('')", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.setIn({ path: '/', value: 42 })).toThrow(t('error.pathCannotBeEmpty'));
        });

        it("'/new key' at root without createParent true works for scalars", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: '/new key', value: 'new value' });
            const expectedValue = `key1: 42
new key: new value
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it("'new key' at root without createParent true works for scalars", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: 'new key', value: 'new value' });
            const expectedValue = `key1: 42
new key: new value
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it("'/new key' at root without createParent true works for objects", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: '/new key', value: { keyA: 'value', keyB: 'value' } });
            const expectedValue = `key1: 42
new key:
  keyA: value
  keyB: value
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it("'new key' at root without createParent true works for objects", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: '/new key', value: { keyA: 'value', keyB: 'value' } });
            const expectedValue = `key1: 42
new key:
  keyA: value
  keyB: value
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('changes existing value at root, adds scalar value', async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: '/key1', value: 'new value' });
            const expectedValue = `key1: new value
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('changes existing value at root, adds object value', async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: '/key1', value: { a: 13, b: 42, c: [1, 2] } });
            const expectedValue = `key1:
  a: 13
  b: 42
  c:
    - 1
    - 2
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('changes existing nested key, adds map correctly', async () => {
            const serializedYaml = `level1 key1:
  - level2 key1: 13
  - level2 key2:
      level3 key1:
        level4 key1: 42
        level4 key2:
          level5 key1: foobar
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const path = '/level1 key1/1/level2 key2/level3 key1/level4 key2/level5 key1';
            doc.setIn({
                path,
                value: { 'level6 key1': { 'level7 key1': 'a', 'level7 key2': 'b', 'level7 key3': 'c' } }
            });
            const expectedValue = `level1 key1:
  - level2 key1: 13
  - level2 key2:
      level3 key1:
        level4 key1: 42
        level4 key2:
          level5 key1:
            level6 key1:
              level7 key1: a
              level7 key2: b
              level7 key3: c
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('will throw an error when called on a path that does not exist, createIntermediateKeys = false', async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.setIn({ path: '/a/b/c', value: 42 })).toThrow();
        });

        it('will not throw an error when called on a path that does not exist, createIntermediateKeys = true', async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.setIn({ path: '/a/b/c', value: 42, createIntermediateKeys: true })).not.toThrow();
            const expectedValue = `key1: 42
a:
  b:
    c: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('will add a comment for a map node', async () => {
            const serializedYaml = `a:
  b:
    c:
      d: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: '/a/b/c/key', value: 13, comment: 'We like prime numbers' });
            const expectedValue = `a:
  b:
    c:
      d: 42
      key:
        #We like prime numbers
        13
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('will add a comment for a node in a seq', async () => {
            const serializedYaml = `a:
  b:
    c:
      - d: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({
                path: '/a/b/c/1/key',
                value: 13,
                comment: 'We like prime numbers',
                createIntermediateKeys: true
            });
            const expectedValue = `a:
  b:
    c:
      - d: 42
      - key:
          #We like prime numbers
          13
`;
            expect(doc.toString()).toEqual(expectedValue);
        });
    });

    describe('addDocumentComment', () => {
        it('adds comment at the beginning', async () => {
            const serializedYaml = 'key1: 42';

            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.addDocumentComment({ comment: 'This goes at the top' });
            const expectedValue = `#This goes at the top

key1: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('adds comment at the beginning (changes existing)', async () => {
            const serializedYaml = `# Old comment

key1: 42`;

            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.addDocumentComment({ comment: 'This goes at the top' });
            const expectedValue = `#This goes at the top

key1: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('adds comment at the end', async () => {
            const serializedYaml = 'key1: 42';

            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.addDocumentComment({ comment: 'This goes at the end', location: 'end' });
            const expectedValue = `key1: 42

#This goes at the end
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('adds comment at the end (changes existing)', async () => {
            const serializedYaml = `# Top comment

key1: 42

# Old comment
`;

            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.addDocumentComment({ comment: 'This goes at the end', location: 'end' });
            const expectedValue = `# Top comment

key1: 42

#This goes at the end
`;
            expect(doc.toString()).toEqual(expectedValue);
        });
    });
});

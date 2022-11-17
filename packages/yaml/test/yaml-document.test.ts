import { errorTemplate } from '../src/errors';
import { YamlDocument } from '../src';
import type { YAMLMap, YAMLSeq } from '../src';
import { interpolate } from '../src/texts';

describe('YamlDocument', () => {
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
        it("throws an error when path is empty ('')", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.setIn({ path: '', value: 42 })).toThrow(errorTemplate.pathCannotBeEmpty);
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

        it("'new key' at root without createParent true works for objects", async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: 'new key', value: { keyA: 'value', keyB: 'value' } });
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
            doc.setIn({ path: 'key1', value: 'new value' });
            const expectedValue = `key1: new value
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('changes existing value at root, adds object value', async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.setIn({ path: 'key1', value: { a: 13, b: 42, c: [1, 2] } });
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
            const path = 'level1 key1.1.level2 key2.level3 key1.level4 key2.level5 key1';
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
            expect(() => doc.setIn({ path: 'a.b.c', value: 42 })).toThrow();
        });

        it('will not throw an error when called on a path that does not exist, createIntermediateKeys = true', async () => {
            const serializedYaml = 'key1: 42';
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.setIn({ path: 'a.b.c', value: 42, createIntermediateKeys: true })).not.toThrow();
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
            doc.setIn({ path: 'a.b.c.key', value: 13, comment: 'We like prime numbers' });
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
                path: 'a.b.c.1.key',
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

    describe('updateAt', () => {
        it('update scalar in existing empty sequence', async () => {
            const serializedYaml = `key1: 42
seq1:
  - name: name1
    config:
      prop1: a
  - name: name2
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.updateAt({ path: 'seq1', matcher: { key: 'name', value: 'name1' }, value: { config: { prop2: 'b' } } });
            const expectedValue = `key1: 42
seq1:
  - name: name1
    config:
      prop1: a
      prop2: b
  - name: name2
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('will update node and overwrite existing values', async () => {
            const serializedYaml = `key1: 42
seq1:
  - name: name1
    config:
      prop1: a
  - name: name2
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.updateAt({
                path: 'seq1',
                matcher: { key: 'name', value: 'name1' },
                value: { name: 'name1', config: { prop2: 'b' } },
                mode: 'overwrite'
            });
            const expectedValue = `key1: 42
seq1:
  - name: name1
    config:
      prop2: b
  - name: name2
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('will throw an error if matching node is not found', async () => {
            const serializedYaml = `key1: 42
seq1:
  - name: name2
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => {
                doc.updateAt({
                    path: 'seq1',
                    matcher: { key: 'name', value: 'name1' },
                    value: { config: { prop2: 'b' } }
                });
            }).toThrowError();
            expect(doc.toString()).toEqual(serializedYaml);
        });

        it('will throw an error if node is not a sequence', async () => {
            const serializedYaml = `key1: 42
seq1:
  - name: name2
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const path = 'key2';
            expect(() => {
                doc.updateAt({
                    path,
                    matcher: { key: 'name', value: 'name1' },
                    value: { config: { prop2: 'b' } }
                });
            }).toThrowError(interpolate(errorTemplate.seqDoesNotExist, { path }));
            expect(doc.toString()).toEqual(serializedYaml);
        });
    });

    describe('deleteAt', () => {
        const serializedYaml = `key1: 42
seq1:
  - name: name1
    config:
      prop1: a
  - name: name2
`;
        it('delete node in existing empty sequence', async () => {
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.deleteAt({ path: 'seq1', matcher: { key: 'name', value: 'name1' } });
            expect(doc.toString()).toMatchInlineSnapshot(`
            "key1: 42
            seq1:
              - name: name2
            "
        `);
        });

        it('try deleting a non-existing node', async () => {
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => {
                doc.deleteAt({ path: 'seq1', matcher: { key: 'name', value: 'unknown' } });
            }).toThrowError();
            expect(doc.toString()).toBe(serializedYaml);
        });
        it('try deleting from a node that is not a sequence', async () => {
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => {
                doc.deleteAt({ path: 'key1', matcher: { key: 'name', value: 'name1' } });
            }).toThrowError();
            expect(doc.toString()).toBe(serializedYaml);
        });
    });

    describe('appendTo', () => {
        it('appends scalar to existing empty sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1: []`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: 42 });
            const expectedValue = `key1: 42
seq1: [ 42 ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar to existing sequence, at root (flow formatting)', async () => {
            const serializedYaml = `key1: 42
seq1: [ 13 ]`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: 42 });
            const expectedValue = `key1: 42
seq1: [ 13, 42 ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar to existing sequence, at root (block formatting)', async () => {
            const serializedYaml = `key1: 42
seq1:
  - 13
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: 42 });
            const expectedValue = `key1: 42
seq1:
  - 13
  - 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object to existing empty sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1: []`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: { item1: 42 } });
            const expectedValue = `key1: 42
seq1: [ { item1: 42 } ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object to existing sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1:
  - name: name1
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: { name: 'name2' } });
            const expectedValue = `key1: 42
seq1:
  - name: name1
  - name: name2
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar, after creating sequence, at root', async () => {
            const serializedYaml = `key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: 42 });
            const expectedValue = `key1: 42
seq1:
  - 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('error if trying to append to non-sequence', async () => {
            const serializedYaml = `key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.appendTo({ path: 'key1', value: 42 })).toThrow();
        });

        it('appends object, after creating sequence, at root', async () => {
            const serializedYaml = `key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: { item1: 42 } });
            const expectedValue = `key1: 42
seq1:
  - item1: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it("error if seq doesn't exist & createIntermediateKeys = false, scalar", async () => {
            const serializedYaml = `key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.appendTo({ path: 'seq1', value: 42, createIntermediateKeys: false })).toThrow();
        });

        it("error if seq doesn't exist & createIntermediateKeys = false, object", async () => {
            const serializedYaml = `key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() => doc.appendTo({ path: 'seq1', value: { item: 42 }, createIntermediateKeys: false })).toThrow();
        });

        it('appends scalar with comment to existing empty sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1: []`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: 42, nodeComment: 'commented item' });
            const expectedValue = `key1: 42
seq1:
  [
    #commented item
    42
  ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar with comment to existing sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1:
  - 13 # old comment`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: 42, nodeComment: 'commented item' });
            const expectedValue = `key1: 42
seq1:
  - 13 # old comment
  #commented item
  - 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object with comment to existing empty sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1: []`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: { item: 42 }, nodeComment: 'commented item' });
            const expectedValue = `key1: 42
seq1:
  [
    #commented item
    { item: 42 }
  ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object with comment to existing sequence, at root', async () => {
            const serializedYaml = `key1: 42
seq1:
  - item: 13 # old comment`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'seq1', value: { item: 42 }, nodeComment: 'commented item' });
            const expectedValue = `key1: 42
seq1:
  - item: 13 # old comment
  #commented item
  - item: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar to existing empty sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1: []`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42 });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1: [ 42 ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar to existing sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1:
          - 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42 });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1:
          - 13
          - 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object to existing empty sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1: []`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 } });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1: [ { item: 42 } ]
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object to existing sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1:
          - item: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 } });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        seq1:
          - item: 13
          - item: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar, after creating sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42 });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42
        seq1:
          - 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object, after creating sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 } });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42
        seq1:
          - item: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it("error if seq doesn't exist & createIntermediateKeys = false, scalar", async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() =>
                doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42, createIntermediateKeys: false })
            ).toThrow();
        });

        it("error if seq doesn't exist & createIntermediateKeys = false, object", async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() =>
                doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 }, createIntermediateKeys: false })
            ).toThrow();
        });

        it('appends scalar with comment to existing empty sequence', async () => {
            const serializedYaml = `# Top comment

key1: 42 # key1
l1: # level 1
  l2: # level 2
    l3: # level 3
      l4: # level 4
        seq1: []

#End comment
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42, nodeComment: ' commented item' });
            const expectedValue = `# Top comment

key1: 42 # key1
l1:
  # level 1
  l2:
    # level 2
    l3:
      # level 3
      l4:
        # level 4
        seq1:
          [
            # commented item
            42
          ]

#End comment
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar with comment to existing sequence', async () => {
            const serializedYaml = `# Top comment

key1: 42 # key1
l1: # level 1
  l2: # level 2
    l3: # level 3
      l4: # level 4
        seq1:
          - 13

#End comment
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42, nodeComment: ' commented item' });
            const expectedValue = `# Top comment

key1: 42 # key1
l1:
  # level 1
  l2:
    # level 2
    l3:
      # level 3
      l4:
        # level 4
        seq1:
          - 13
          # commented item
          - 42

#End comment
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object with comment to existing emptysequence', async () => {
            const serializedYaml = `# Top comment

key1: 42 # key1
l1: # level 1
  l2: # level 2
    l3: # level 3
      l4: # level 4
        seq1: []

#End comment
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 }, nodeComment: ' commented item' });
            const expectedValue = `# Top comment

key1: 42 # key1
l1:
  # level 1
  l2:
    # level 2
    l3:
      # level 3
      l4:
        # level 4
        seq1:
          [
            # commented item
            { item: 42 }
          ]

#End comment
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object with comment to existing sequence', async () => {
            const serializedYaml = `# Top comment

key1: 42 # key1
l1: # level 1
  l2: # level 2
    l3: # level 3
      l4: # level 4
        seq1:
          - item: 13

#End comment
`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 }, nodeComment: ' commented item' });
            const expectedValue = `# Top comment

key1: 42 # key1
l1:
  # level 1
  l2:
    # level 2
    l3:
      # level 3
      l4:
        # level 4
        seq1:
          - item: 13
          # commented item
          - item: 42

#End comment
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends scalar with comment, after creating sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: 42, nodeComment: 'commented item' });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42
        seq1:
          #commented item
          - 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('appends object with comment, after creating sequence', async () => {
            const serializedYaml = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({ path: 'l1.l2.l3.l4.seq1', value: { item: 42 }, nodeComment: 'commented item' });
            const expectedValue = `key1: 42
l1:
  l2:
    l3:
      l4:
        key1: 42
        seq1:
          #commented item
          - item: 42
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('adds comments to object properties, existing seq at root', async () => {
            const serializedYaml = `seq1:
  - a: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({
                path: 'seq1',
                value: { a: 1, b: { c: { d: 42 } } },
                comments: [
                    { path: 'a', comment: 'A' },
                    { path: 'b.c.d', comment: 'The answer!' }
                ]
            });
            const expectedValue = `seq1:
  - a: 13
  - a: 1 #A
    b:
      c:
        d: 42 #The answer!
`;
            expect(doc.toString()).toEqual(expectedValue);
        });

        it('throws an error when trying to add comment to a scalar, existing seq at root', async () => {
            const serializedYaml = `seq1:
  - a: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            expect(() =>
                doc.appendTo({
                    path: 'seq1',
                    value: 42,
                    comments: [
                        { path: 'a', comment: 'A' },
                        { path: 'b.c.d', comment: 'The answer!' }
                    ]
                })
            ).toThrow(errorTemplate.scalarValuesDoNotHaveProperties);

            expect(doc.toString().trim()).toEqual(serializedYaml);
        });

        it('adds comments to object properties, creating seq at root', async () => {
            const serializedYaml = `seq2:
- a: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            doc.appendTo({
                path: 'seq1',
                value: { a: 1, b: { c: { d: 42 } } },
                comments: [
                    { path: 'a', comment: 'A' },
                    { path: 'b.c.d', comment: 'The answer!' }
                ]
            });
            const expectedValue = `seq2:
  - a: 13
seq1:
  - a: 1 #A
    b:
      c:
        d: 42 #The answer!
`;
            expect(doc.toString()).toEqual(expectedValue);
        });
    });

    it('adds comments to object properties, existing seq', async () => {
        const serializedYaml = `seq1:
  - a: 13
  - a:
      b:
        c: 42
        d:
          - w: 13`;
        const doc = await YamlDocument.newInstance(serializedYaml);
        doc.appendTo({
            path: 'seq1.1.a.b.d',
            value: { w: 1, x: { y: { z: 42 } } },
            comments: [
                { path: 'w', comment: 'W' },
                { path: 'x.y.z', comment: 'The answer!' }
            ]
        });
        const expectedValue = `seq1:
  - a: 13
  - a:
      b:
        c: 42
        d:
          - w: 13
          - w: 1 #W
            x:
              y:
                z: 42 #The answer!
`;
        expect(doc.toString()).toEqual(expectedValue);
    });

    it('throws an error when trying to add comment to a scalar, existing seq', async () => {
        const serializedYaml = `seq1:
  - a: 13`;
        const doc = await YamlDocument.newInstance(serializedYaml);
        expect(() =>
            doc.appendTo({
                path: 'seq1.1',
                value: 42,
                comments: [
                    { path: 'a', comment: 'A' },
                    { path: 'b.c.d', comment: 'The answer!' }
                ]
            })
        ).toThrow(errorTemplate.scalarValuesDoNotHaveProperties);

        expect(doc.toString().trim()).toEqual(serializedYaml);
    });

    it('throws an error when trying to add comment to a object, missing property, existing seq', async () => {
        const serializedYaml = `seq1:
  - a: 13`;
        const doc = await YamlDocument.newInstance(serializedYaml);
        const path = 'b.c.d';
        expect(() =>
            doc.appendTo({
                path: 'seq1.1',
                value: { a: 42 },
                comments: [{ path, comment: 'The answer!' }]
            })
        ).toThrow(interpolate(errorTemplate.propertyNotFound, { path }));

        expect(doc.toString().trim()).toEqual(serializedYaml);
    });

    describe('getNode', () => {
        it('will return a node searching from the root', async () => {
            const serializedYaml = `seq1:
  - a: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const node = doc.getNode({
                path: 'seq1.0'
            });

            expect(String(node)).toEqual(JSON.stringify({ a: 13 }));
        });

        it('will return a node starting from a seq', async () => {
            const serializedYaml = `seq1:
  - a: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const start = doc.getNode({ path: 'seq1' }) as YAMLSeq;
            const node = doc.getNode({
                path: '0',
                start
            });

            expect(String(node)).toEqual(JSON.stringify({ a: 13 }));
        });

        it('will return a node starting from a map', async () => {
            const serializedYaml = `l1:
  l2:
    l3: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const start = doc.getNode({ path: 'l1' }) as YAMLSeq;
            const node = doc.getNode({
                path: 'l2',
                start
            });

            expect(String(node)).toEqual(JSON.stringify({ l3: 13 }));
        });

        it('will throw an error if starting node is a scalar', async () => {
            const serializedYaml = `l1:
  l2:
    l3: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const start = doc.getNode({ path: 'l1.l2.l3' }) as YAMLSeq;
            const path = 'l4';
            expect(() =>
                doc.getNode({
                    path,
                    start
                })
            ).toThrow(interpolate(errorTemplate.startNodeMustBeCollection, { path }));

            expect(doc.toString().trim()).toEqual(serializedYaml);
        });

        it('will throw an error if node is not found', async () => {
            const serializedYaml = `l1:
  l2:
    l3: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const path = 'l1.l2.1.l4';
            expect(() =>
                doc.getNode({
                    path
                })
            ).toThrow(interpolate(errorTemplate.nodeNotFound, { path }));

            expect(doc.toString().trim()).toEqual(serializedYaml);
        });
    });
    describe('getSequence', () => {
        it('will return a sequence', async () => {
            const serializedYaml = `l1:
  l2:
    - l3: 13
    - l3: 14`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const seq = doc.getSequence({
                path: 'l1.l2'
            }) as YAMLSeq;

            expect(seq.toJSON()).toEqual([{ l3: 13 }, { l3: 14 }]);
        });

        it('will throw an error if node is not a seq', async () => {
            const serializedYaml = `l1:
  l2:
    - l3: 13
    - l3: 14`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const path = 'l1.l2.0';
            expect(() =>
                doc.getSequence({
                    path
                })
            ).toThrow(interpolate(errorTemplate.seqDoesNotExist, { path }));

            expect(doc.toString().trim()).toEqual(serializedYaml);
        });
    });

    describe('getMap', () => {
        it('will return a sequence', async () => {
            const serializedYaml = `l1:
  l2:
    l3: 13`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const seq = doc.getMap({
                path: 'l1.l2'
            }) as YAMLMap;

            expect(seq.toJSON()).toEqual({ l3: 13 });
        });

        it('will throw an error if node is not a map', async () => {
            const serializedYaml = `l1:
  l2:
    - l3: 13
    - l3: 14`;
            const doc = await YamlDocument.newInstance(serializedYaml);
            const path = 'l1.l2';
            expect(() =>
                doc.getMap({
                    path
                })
            ).toThrow(interpolate(errorTemplate.nodeNotAMap, { path }));

            expect(doc.toString().trim()).toEqual(serializedYaml);
        });
    });
});

import { appendFile, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEdmx } from '../../src/schema/edmx.js';
import { classifySchema } from '../../src/semantics/classifier.js';
import { parseSemanticRuleStore, SEMANTIC_RULE_STORE_PATH } from '../../src/semantics/rule-store.js';
import { openFileCompletionStore } from '../../src/model/file-completion-store.js';
import { errnoCode, errorMessage, isErrorNamed } from '../../src/guards.js';
import { readFileSync } from 'node:fs';
import type { SemanticClassifier } from '../../src/types.js';

const graph = parseEdmx(`<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer>
      <EntityType Name="Record">
        <Key><PropertyRef Name="ID" /></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String" MaxLength="40" />
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);

describe('propagated error causes', () => {
    it('reports why the classifier failed for a field, also after a failed batch', async () => {
        // Given a classifier whose batch call fails and whose single call fails for one field
        const classifier: SemanticClassifier = {
            fingerprint: 'test',
            classify: jest.fn(async (input) => {
                if (input.propertyName === 'Name') {
                    throw new Error('encoder session failed');
                }
                return { role: 'unknown', confidence: 0, source: 'classifier' as const };
            }),
            classifyBatch: jest.fn(async () => {
                throw new Error('batch too large');
            })
        };
        // When the schema is classified
        const result = await classifySchema(graph, classifier, new AbortController().signal);
        // Then only the field that failed on its own is reported, with its own cause
        expect(result.diagnostics).toEqual([
            expect.objectContaining({
                code: 'CLASSIFIER_INFERENCE_FAILED',
                target: 'Records.Name',
                message: expect.stringContaining('Cause: encoder session failed')
            })
        ]);
    });

    it('keeps the regular-expression error as the cause of an invalid rule pattern', () => {
        // Given the packaged rule store with an invalid model-output filter
        const store = JSON.parse(readFileSync(new URL(`../../${SEMANTIC_RULE_STORE_PATH}`, import.meta.url), 'utf8'));
        const filters = { ...store.modelOutputFilters, pathOrUrl: '(' };
        // When it is parsed
        let caught: unknown;
        try {
            parseSemanticRuleStore({ ...store, modelOutputFilters: filters });
        } catch (error) {
            caught = error;
        }
        // Then the error names the pattern and carries the engine's SyntaxError as its cause
        expect(errorMessage(caught)).toMatch(/pathOrUrl is not a valid regular expression/u);
        expect(isErrorNamed(caught instanceof Error ? caught.cause : undefined, 'SyntaxError')).toBe(true);
    });

    it('skips a torn answer line and reports an answer directory that cannot be created', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'mockgen-causes-'));
        try {
            // Given an answer file whose last line was torn by an interrupted write
            const store = openFileCompletionStore({ directory, namespace: 'revision' });
            store.set('a'.repeat(64), 'answer');
            const [answers] = await readdir(directory);
            await appendFile(join(directory, answers), '{"k":"');
            // And a directory path that names an existing file
            const file = join(directory, 'file');
            await writeFile(file, '');
            // When stores are opened on both
            const reopened = openFileCompletionStore({ directory, namespace: 'revision' });
            const unusable = openFileCompletionStore({ directory: join(file, 'answers'), namespace: 'revision' });
            // Then the torn line is skipped and the complete answer is kept
            expect(reopened.failure).toBeUndefined();
            expect(reopened.get('a'.repeat(64))).toBe('answer');
            // And the unusable store reports the file-system cause and keeps answers in memory
            expect(unusable.failure).toMatch(/ENOTDIR|EEXIST/u);
            unusable.set('b'.repeat(64), 'kept');
            expect(unusable.get('b'.repeat(64))).toBe('kept');
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });

    it('reads Node.js error codes and error names structurally', () => {
        // Given errors of several shapes
        const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
        // When their codes and names are read
        // Then system codes and names are found, and other values have none
        expect(errnoCode(missing)).toBe('ENOENT');
        expect(errnoCode({ code: 'EACCES' })).toBe('EACCES');
        expect(errnoCode(new Error('plain'))).toBeUndefined();
        expect(errnoCode({ code: 1 })).toBeUndefined();
        expect(errnoCode('ENOENT')).toBeUndefined();
        expect(isErrorNamed(new TypeError('x'), 'TypeError')).toBe(true);
        expect(isErrorNamed(new RangeError('x'), 'TypeError')).toBe(false);
        expect(isErrorNamed(undefined, 'TypeError')).toBe(false);
        expect(errorMessage('text')).toBe('text');
    });
});

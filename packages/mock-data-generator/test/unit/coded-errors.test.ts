import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger } from '@sap-ux/logger';
import { runMockgenCli } from '../../src/cli.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../../src/errors.js';
import { t } from '../../src/i18n.js';
import { generateServiceForTesting } from '../../src/index.js';
import { parseGenerateProjectDataInput } from '../../src/project-data-input.js';
import { acquireProjectLock } from '../../src/project-lock.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import { packagedResourceInvalid } from '../../src/semantics/resource-integrity.js';
import type { MockDataServiceRequest } from '../../src/types.js';

/**
 * A logger that records what it is given, standing in for the console logger.
 *
 * @returns the logger and the recorded messages by level
 */
function recordingLogger(): { logger: Logger; errors: string[]; infos: string[] } {
    const errors: string[] = [];
    const infos: string[] = [];
    const logger = {
        error: (message: string | object) => errors.push(String(message)),
        info: (message: string | object) => infos.push(String(message)),
        warn: () => undefined,
        debug: () => undefined
    } as unknown as Logger;
    return { logger, errors, infos };
}

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`
    },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};

describe('MockGenError', () => {
    it('carries a stable code, the message and the cause', () => {
        // Given an underlying failure
        const cause = new Error('disk unavailable');
        // When it is reported as a coded error
        const error = new MockGenError(MOCKGEN_ERROR_CODE.FILE_UNREADABLE, 'cannot read', { cause });
        // Then the code, message, name and cause are kept
        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({ name: 'MockGenError', code: 'FILE_UNREADABLE', message: 'cannot read' });
        expect(error.cause).toBe(cause);
    });

    it('names every code by its own value', () => {
        // Given the code object, Then each key equals its value, so callers can use either
        for (const [key, value] of Object.entries(MOCKGEN_ERROR_CODE)) {
            expect(value).toBe(key);
        }
    });
});

describe('coded failures', () => {
    it('reports an invalid request document as REQUEST_INVALID naming the JSON path', () => {
        // Given a request document whose service has no URL path
        const document = {
            projectRoot: '/project',
            dataDirectory: 'webapp/localService/mockdata',
            request: { metadata: { format: 'edmx', content: '' }, service: { odataVersion: '4.0' } }
        };
        // When it is parsed, Then the coded error names the path
        expect(() => parseGenerateProjectDataInput(document)).toThrow(
            expect.objectContaining({
                code: 'REQUEST_INVALID',
                message: 'MockGen request.service.urlPath must be a string'
            })
        );
    });

    it('reports an invalid generation option as REQUEST_INVALID', async () => {
        // Given a seed that is not an integer, When generation starts, Then it is rejected before generating
        await expect(generateServiceForTesting(request, { seed: 1.5, mode: 'deterministic' })).rejects.toMatchObject({
            code: 'REQUEST_INVALID',
            message: 'Mock data generator seed must be a safe integer'
        });
    });

    it('reports unreadable metadata as METADATA_INVALID with the parser cause', () => {
        // Given a CSN document that is not JSON
        const metadata = { format: 'csn' as const, content: '{ not json' };
        // When it is parsed, Then the coded error keeps the JSON failure as its cause
        expect(() => parseServiceMetadata(metadata)).toThrow(
            expect.objectContaining({
                code: 'METADATA_INVALID',
                cause: expect.objectContaining({ name: 'SyntaxError' })
            })
        );
    });

    it('reports a shipped resource that fails its parser as RESOURCE_INTEGRITY with the parser cause', () => {
        // Given the parser failure of a shipped resource
        const cause = new TypeError('lexicalRules must be a non-empty list');
        // When it is reported where the package loads the resource
        const error = packagedResourceInvalid('integrity.resourceName.semanticRuleStore', cause);
        // Then the coded error names the resource and keeps the parser error
        expect(error).toMatchObject({
            code: 'RESOURCE_INTEGRITY',
            message: 'The packaged MockGen semantic rule store is invalid: lexicalRules must be a non-empty list'
        });
        expect(error.cause).toBe(cause);
    });

    it('reports a lock held by a live process as PROJECT_LOCKED with its remedy', async () => {
        // Given a held project lock
        const parent = await mkdtemp(join(tmpdir(), 'mockgen-coded-lock-'));
        const held = await acquireProjectLock(parent);
        try {
            // When another caller waits only briefly, Then it gets the coded, actionable error
            await expect(acquireProjectLock(parent, { timeoutMs: 20 })).rejects.toMatchObject({
                code: 'PROJECT_LOCKED',
                message: expect.stringMatching(
                    /locked by process \d+ on .+ since .+ Waited 20 ms\. Wait for the other run to finish/u
                )
            });
        } finally {
            await held.release();
            await rm(parent, { recursive: true, force: true });
        }
    });
});

describe('mockgen CLI logging', () => {
    it('logs a usage error through the logger and rethrows it with code CLI_USAGE', async () => {
        // Given a logger that records messages
        const { logger, errors } = recordingLogger();
        // When the CLI is called with an unknown command
        // Then the failure is coded and logged once
        await expect(runMockgenCli(['unknown'], logger)).rejects.toMatchObject({ code: 'CLI_USAGE' });
        expect(errors).toEqual([t('cli.usage')]);
    });

    it('prints the usage through the logger for help', async () => {
        // Given a logger that records messages
        const { logger, infos, errors } = recordingLogger();
        // When help is requested, Then the usage is logged and the command succeeds
        await expect(runMockgenCli(['--help'], logger)).resolves.toBe(0);
        expect(infos).toEqual(['Usage: mockgen help | mockgen info | mockgen generate --input <request.json>']);
        expect(errors).toEqual([]);
    });

    it.each([
        [['generate', '--input'], 'MockGen requires unique --name value options'],
        [['generate', '--input', 'a.json', '--input', 'b.json'], 'MockGen requires unique --name value options'],
        [['generate', '--output', 'a.json'], 'Usage: mockgen generate --input <request.json>']
    ])('rejects the command line %p as CLI_USAGE', async (args, message) => {
        // Given a recording logger
        const { logger, errors } = recordingLogger();
        // When the CLI receives a malformed generate command, Then the usage error is coded and logged
        await expect(runMockgenCli(args, logger)).rejects.toMatchObject({ code: 'CLI_USAGE', message });
        expect(errors).toEqual([message]);
    });

    it('writes the package information as one JSON document on standard output', async () => {
        // Given standard output captured
        const written: string[] = [];
        const write = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
            written.push(String(chunk));
            return true;
        });
        const { logger, errors } = recordingLogger();
        try {
            // When the information is requested
            await expect(runMockgenCli(['info'], logger)).resolves.toBe(0);
        } finally {
            write.mockRestore();
        }
        // Then the output parses as the model identity and nothing is logged
        expect(JSON.parse(written.join(''))).toMatchObject({ model: { bundleId: 'mockgen-v1' } });
        expect(errors).toEqual([]);
    });

    it('reports an unreadable request document as FILE_UNREADABLE', async () => {
        // Given a request file that is not JSON
        const directory = await mkdtemp(join(tmpdir(), 'mockgen-coded-cli-'));
        const input = join(directory, 'request.json');
        await writeFile(input, 'not json');
        const { logger, errors } = recordingLogger();
        try {
            // When the CLI generates from it, Then the coded error is logged with the file and a remedy
            await expect(runMockgenCli(['generate', '--input', input], logger)).rejects.toMatchObject({
                code: 'FILE_UNREADABLE'
            });
            expect(errors).toEqual([expect.stringContaining('Pass --input with a readable JSON file.')]);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
});

describe('translations', () => {
    it('interpolates values verbatim, without HTML escaping', () => {
        // Given a value with markup characters, When it is interpolated, Then it is kept as written
        expect(t('request.mustBeOneOf', { path: 'options.mode', values: '<a>, "b" & c' })).toBe(
            'MockGen options.mode must be one of <a>, "b" & c'
        );
    });
});

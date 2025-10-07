import { join } from 'node:path';
import { promises } from 'node:fs';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { traceChanges } from '../../../src/tracing';
import * as logger from '../../../src/tracing/logger';

describe('Test traceChanges()', () => {
    let loggerMock: ToolsLogger;
    const rootPath = join(__dirname, '../../fixtures/trace-changes');

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock setup
        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        jest.spyOn(logger, 'getLogger').mockImplementation(() => loggerMock);
    });

    test('New file', async () => {
        // Mock setup
        const newFile = join(__dirname, 'NEW_FILE');
        const fsMock = {
            dump: () => ({ [newFile]: { contents: 'CONTENT', state: 'modified' } })
        } as Partial<Editor> as Editor;

        // Test execution
        await traceChanges(fsMock);

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining(`'${newFile}' added`));
        expect(loggerMock.debug).toHaveBeenCalledWith('File content:\nCONTENT');
    });

    test('Unchanged file', async () => {
        // Mock setup
        const unchangedFile = join(rootPath, 'file');
        const contents = await promises.readFile(unchangedFile, { encoding: 'utf8' });
        const fsMock = {
            dump: () => ({ [unchangedFile]: { contents, state: 'modified' } })
        } as Partial<Editor> as Editor;

        // Test execution s
        await traceChanges(fsMock);

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining(`'${unchangedFile}' unchanged`));
        expect(loggerMock.debug).toHaveBeenCalledWith(`File content:\n${contents}`);
    });

    test('Modified json file', async () => {
        // Mock setup
        const modifiedFile = join(rootPath, 'file.json');
        const fsMock = {
            dump: () => ({
                [modifiedFile]: {
                    contents: `{"rootProp": "changed property on root","object": {"array": ["one", "three", "four"],"nestedProp": "Changed nested property value"}}`,
                    state: 'modified'
                }
            })
        } as Partial<Editor> as Editor;

        // Test execution
        await traceChanges(fsMock);

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining(`'${modifiedFile}' modified`));
        expect(loggerMock.debug).toHaveBeenCalledWith(`File changes:
\x1B[90m{\x1B[39m
\x1B[90m  "object": {\x1B[39m
\x1B[90m    "array": [\x1B[39m
\x1B[90m      "one",\x1B[39m
\x1B[90m\x1B[39m\x1B[31m      "two",\x1B[39m
\x1B[31m\x1B[39m\x1B[90m      "three",\x1B[39m
\x1B[90m\x1B[39m\x1B[32m      "four"\x1B[39m
\x1B[32m\x1B[39m\x1B[90m    ],\x1B[39m
\x1B[90m\x1B[39m\x1B[31m    "nestedProp": "Nested property value"\x1B[39m
\x1B[31m\x1B[39m\x1B[32m    "nestedProp": "Changed nested property value"\x1B[39m
\x1B[32m\x1B[39m\x1B[90m  },\x1B[39m
\x1B[90m\x1B[39m\x1B[31m  "rootProp": "property on root"\x1B[39m
\x1B[31m\x1B[39m\x1B[32m  "rootProp": "changed property on root"\x1B[39m
\x1B[32m\x1B[39m\x1B[90m}\x1B[39m`);
    });

    test('Modified yaml file', async () => {
        // Mock setup
        const modifiedFile = join(rootPath, 'file.yaml');
        const fsMock = {
            dump: () => ({
                [modifiedFile]: {
                    contents: `rootProperty: 'changed prop on root'
nested:
    - item: one
    - item: three
`,
                    state: 'modified'
                }
            })
        } as Partial<Editor> as Editor;

        // Test execution
        await traceChanges(fsMock);

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining(`'${modifiedFile}' modified`));
        expect(loggerMock.debug).toHaveBeenCalledWith(
            `File changes:
[31mrootProperty: 'prop on root'[39m
[31m[39m[32mrootProperty: 'changed prop on root'[39m
[32m[39m[90mnested:[39m
[90m- item: one[39m
[90m[39m[31m- item: two[39m
[31m[39m[32m- item: three[39m
[32m[39m`
        );
    });

    test('Modified file without type', async () => {
        // Mock setup
        const modifiedFile = join(rootPath, 'file');
        const fsMock = {
            dump: () => ({
                [modifiedFile]: {
                    contents: 'modified content',
                    state: 'modified'
                }
            })
        } as Partial<Editor> as Editor;

        // Test execution
        await traceChanges(fsMock);

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining(`'${modifiedFile}' modified`));
        expect(loggerMock.debug).toHaveBeenCalledWith(
            `Can't compare file. New file content:
modified content`
        );
    });
});

import { addVariantsManagementScript } from '../../../src/variants-config/package-json';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import * as projectAccessMock from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

import { join } from 'path';

describe('addVariantsManagementScript', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');
    const legacyBasePath = join(__dirname, '../../fixtures/variants-config/deprecated-config');

    const loggerMock: ToolsLogger = { debug: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
    let fs: Editor;
    let debugMock: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        debugMock = loggerMock.debug as any;
    });

    test('add variants-management script to package.json', async () => {
        await addVariantsManagementScript(fs, basePath, loggerMock);
        expect(debugMock.mock.calls[0][0]).toEqual(`Script 'start-variants-management' written to 'package.json'.`);
    });
});

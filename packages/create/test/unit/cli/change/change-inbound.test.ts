import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import * as mockFs from 'fs';
import { join } from 'path';

const cloudDescriptorVariant = JSON.parse(
    jest
        .requireActual('fs')
        .readFileSync(
            join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant.cloud'),
            'utf-8'
        )
);
const onPremiseDescriptorVariant = JSON.parse(
    jest
        .requireActual('fs')
        .readFileSync(join(__dirname, '../../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
);

describe('change/inbound', () => {
    let loggerMock: ToolsLogger;
    const memFsEditorMock = {
        create: jest.fn().mockReturnValue({
            commit: jest.fn().mockImplementation((cb) => cb())
        })
    };
})

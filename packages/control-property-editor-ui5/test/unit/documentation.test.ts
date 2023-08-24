import * as Documentation from '../../src/documentation';
import * as Utils from '../../src/utils';
import fs from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import type { SchemaForApiJsonFiles } from '../../src/apiJson';

describe('Documentation', () => {
    const path = join(cwd(), 'test', 'unit', 'testData', 'api.json');
    const sapUiCompMetadata = JSON.parse(fs.readFileSync(path, 'utf8'));
    const ui5ApiDtMetadata: Map<string, SchemaForApiJsonFiles> = new Map();
    ui5ApiDtMetadata.set('sap.ui.comp', sapUiCompMetadata);
    beforeAll(() => {
        const apiJson = {
            json: () => {
                return sapUiCompMetadata;
            }
        };
        global.fetch = jest.fn(() => Promise.resolve(apiJson));
    });

    test('Get Documention for sap.ui.comp.filterbar.FilterBar', async () => {
        jest.spyOn(Utils, 'getLibrary').mockImplementation(() => {
            return Promise.resolve('');
        });
        const result = await Documentation.getDocumentation('sap.ui.comp.filterbar.FilterBar', 'sap.ui.comp');
        expect(result).toMatchSnapshot();
    });
});

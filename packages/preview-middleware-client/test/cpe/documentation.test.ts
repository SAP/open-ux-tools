import * as Documentation from '../../src/cpe/documentation';
import * as Utils from '../../src/cpe/utils';
import type { SchemaForApiJsonFiles } from '../../src/cpe/api-json';
import apiJson from '../fixtures/api.json';
import { fetchMock } from 'mock/window';

describe('Documentation', () => {
    const sapUiCompMetadata = JSON.parse(JSON.stringify(apiJson));
    const ui5ApiDtMetadata: Map<string, SchemaForApiJsonFiles> = new Map();
    ui5ApiDtMetadata.set('sap.ui.comp', sapUiCompMetadata);
    beforeAll(() => {
        const apiJson = {
            json: () => {
                return sapUiCompMetadata;
            }
        };
        fetchMock.mockResolvedValue(apiJson);
    });

    test('Get Documention for sap.ui.comp.filterbar.FilterBar', async () => {
        jest.spyOn(Utils, 'getLibrary').mockImplementation(() => {
            return Promise.resolve('');
        });
        const result = await Documentation.getDocumentation('sap.ui.comp.filterbar.FilterBar', 'sap.ui.comp');
        expect(result).toMatchSnapshot();
    });
});

import * as utils from '../../../src/prompts/utils';
import type { ManifestNamespace } from '@sap-ux/project-access';

describe('getDataSourceIds', () => {
    // Mock data
    const dataSources = {
        'mainService': {
            'uri': '/sap/opu/odata/main/service',
            'type': 'OData',
            'settings': {
                'annotations': ['secondService'],
                'localUri': 'localService/mockdata/metadata.xml'
            }
        },
        'secondService': {
            'uri': '/sap/opu/odata/second/service/',
            'type': 'ODataAnnotation',
            'settings': {
                'localUri': 'localService/SEPMRA_PROD_MAN_ANNO_MDL.xml'
            }
        }
    } as Record<string, ManifestNamespace.DataSource>;
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('gets data source ids', () => {
        jest.spyOn(utils, 'filterDataSourcesByType').mockReturnValueOnce({ 'mainService': dataSources['mainService'] });
        const result = utils.getDataSourceIds(dataSources);
        expect(result).toEqual(['mainService']);
    });
    test('filters data sources by type', () => {
        const result = utils.filterDataSourcesByType(dataSources, 'OData');
        expect(result).toEqual({ 'mainService': dataSources['mainService'] });
    });
});

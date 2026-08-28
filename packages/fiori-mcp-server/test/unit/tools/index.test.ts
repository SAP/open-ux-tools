import { tools } from '../../../src/tools/index.js';

const listFioriApps = tools.find((tool) => tool.name === 'list_fiori_apps');
const listFunctionality = tools.find((tool) => tool.name === 'list_functionality');
const getFunctionalityDetails = tools.find((tool) => tool.name === 'get_functionality_details');
const executeFunctionaliy = tools.find((tool) => tool.name === 'execute_functionality');

describe('Tools schemas', () => {
    test('list_fiori_apps', async () => {
        expect(listFioriApps?.inputSchema).toMatchSnapshot('Input schema for "list_fiori_apps"');
        expect(listFioriApps?.outputSchema).toMatchSnapshot('Output schema for "list_fiori_apps"');
    });

    test('list_functionality', async () => {
        expect(listFunctionality?.inputSchema).toMatchSnapshot('Input schema for "list_functionality"');
        expect(listFunctionality?.outputSchema).toMatchSnapshot('Output schema for "list_functionality"');
    });

    test('get_functionality_details', async () => {
        expect(getFunctionalityDetails?.inputSchema).toMatchSnapshot('Input schema for "get_functionality_details"');
        expect(getFunctionalityDetails?.outputSchema).toMatchSnapshot('Output schema for "get_functionality_details"');
    });

    test('execute_functionality', async () => {
        expect(executeFunctionaliy?.inputSchema).toMatchSnapshot('Input schema for "execute_functionality"');
        expect(executeFunctionaliy?.outputSchema).toMatchSnapshot('Output schema for "execute_functionality"');
    });
});

describe('Tool routing guidance', () => {
    const searchDocs = tools.find((tool) => tool.name === 'search_docs');
    const downloadMetadata = tools.find((tool) => tool.name === 'download_odata_service_metadata');

    test('search_docs description mentions update service metadata', () => {
        expect(searchDocs?.description).toMatch(/update.*service.*metadata/i);
    });

    test('download_odata_service_metadata description excludes update/refresh use case', () => {
        expect(downloadMetadata?.description).toMatch(/do not use.*update|updating.*existing/i);
    });
});

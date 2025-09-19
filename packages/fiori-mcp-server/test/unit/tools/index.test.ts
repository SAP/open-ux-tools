import { tools } from '../../../src/tools/index';

const listFioriApps = tools.find((tool) => tool.name === 'list_fiori_apps');
const listFunctionality = tools.find((tool) => tool.name === 'list_functionality');
const getFunctionalityDetails = tools.find((tool) => tool.name === 'get_functionality_details');
const executeFunctionaliy = tools.find((tool) => tool.name === 'execute_functionality');

describe('Tools schemas', () => {
    test('list_fiori_apps', async () => {
        expect(listFioriApps?.inputSchema).toMatchSnapshot('Input schema for "list-fiori-apps"');
        expect(listFioriApps?.outputSchema).toMatchSnapshot('Output schema for "list-fiori-apps"');
    });

    test('list_functionality', async () => {
        expect(listFunctionality?.inputSchema).toMatchSnapshot('Input schema for "list-functionality"');
        expect(listFunctionality?.outputSchema).toMatchSnapshot('Output schema for "list-functionality"');
    });

    test('get_functionality_details', async () => {
        expect(getFunctionalityDetails?.inputSchema).toMatchSnapshot('Input schema for "get-functionality-details"');
        expect(getFunctionalityDetails?.outputSchema).toMatchSnapshot('Output schema for "get-functionality-details"');
    });

    test('execute_functionality', async () => {
        expect(executeFunctionaliy?.inputSchema).toMatchSnapshot('Input schema for "execute-functionality"');
        expect(executeFunctionaliy?.outputSchema).toMatchSnapshot('Output schema for "execute-functionality"');
    });
});

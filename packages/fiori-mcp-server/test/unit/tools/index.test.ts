import { tools } from '../../../src/tools/index';

const listFioriApps = tools.find((tool) => tool.name === 'list-fiori-apps');
const listFunctionality = tools.find((tool) => tool.name === 'list-functionality');
const getFunctionalityDetails = tools.find((tool) => tool.name === 'get-functionality-details');
const executeFunctionaliy = tools.find((tool) => tool.name === 'execute-functionality');

describe('Tools schemas', () => {
    test('list-fiori-apps', async () => {
        expect(listFioriApps?.inputSchema).toMatchSnapshot('Input schema for "list-fiori-apps"');
        expect(listFioriApps?.outputSchema).toMatchSnapshot('Output schema for "list-fiori-apps"');
    });

    test('list-functionality', async () => {
        expect(listFunctionality?.inputSchema).toMatchSnapshot('Input schema for "list-functionality"');
        expect(listFunctionality?.outputSchema).toMatchSnapshot('Output schema for "list-functionality"');
    });

    test('get-functionality-details', async () => {
        expect(getFunctionalityDetails?.inputSchema).toMatchSnapshot('Input schema for "get-functionality-details"');
        expect(getFunctionalityDetails?.outputSchema).toMatchSnapshot('Output schema for "get-functionality-details"');
    });

    test('execute-functionality', async () => {
        expect(executeFunctionaliy?.inputSchema).toMatchSnapshot('Input schema for "execute-functionality"');
        expect(executeFunctionaliy?.outputSchema).toMatchSnapshot('Output schema for "execute-functionality"');
    });
});

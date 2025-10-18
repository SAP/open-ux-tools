import { tools } from '../../../src/tools/index';

const listFioriApps = tools.find((tool) => tool.name === 'list_fiori_apps');
const listFunctionality = tools.find((tool) => tool.name === 'list_functionality');
const getFunctionalityDetails = tools.find((tool) => tool.name === 'get_functionality_details');
const executeFunctionaliy = tools.find((tool) => tool.name === 'execute_functionality');
const getFioriRules = tools.find((tool) => tool.name === 'get_fiori_rules');

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

    test('get_fiori_rules', async () => {
        expect(getFioriRules).toBeDefined();
        expect(getFioriRules?.name).toBe('get_fiori_rules');
        expect(getFioriRules?.description).toContain('rules and best practices');
        expect(getFioriRules?.inputSchema).toBeDefined();
        expect(getFioriRules?.inputSchema.type).toBe('object');
        expect(getFioriRules?.inputSchema.properties).toEqual({});
        expect(getFioriRules?.inputSchema.required).toEqual([]);
    });
});

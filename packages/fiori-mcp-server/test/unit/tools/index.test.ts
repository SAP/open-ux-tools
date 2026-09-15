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

    test('adp tools are excluded when SAP_FIORI_MCP_ADP_TOOLS is not "true"', () => {
        // The module is imported without the env var set, so adpToolsEnabled is false.
        const adpOnlyNames = [
            'lookup_ui5_documentation',
            'generate_adaptation_project',
            'open_adaptation_editor',
            'adp_controller_extension',
            'run_rta_workflow_step',
            'read_odata_metadata_adp'
        ];
        for (const name of adpOnlyNames) {
            expect(tools.find((t) => t.name === name)).toBeUndefined();
        }
    });
});

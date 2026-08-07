import { tools } from '../../../src/tools/index.js';

const listFioriApps = tools.find((tool) => tool.name === 'list_fiori_apps');
const downloadODataServiceMetadata = tools.find((tool) => tool.name === 'download_odata_service_metadata');
const listFunctionality = tools.find((tool) => tool.name === 'list_functionality');
const getFunctionalityDetails = tools.find((tool) => tool.name === 'get_functionality_details');
const executeFunctionaliy = tools.find((tool) => tool.name === 'execute_functionality');

describe('Tools schemas', () => {
    test('list_fiori_apps', async () => {
        expect(listFioriApps?.inputSchema).toMatchSnapshot('Input schema for "list_fiori_apps"');
        expect(listFioriApps?.outputSchema).toMatchSnapshot('Output schema for "list_fiori_apps"');
    });

    test('download_odata_service_metadata documents its appPath precondition', () => {
        expect(downloadODataServiceMetadata?.inputSchema).toMatchObject({
            properties: {
                appPath: {
                    description:
                        'Absolute path to an existing folder where `metadata.xml` will be written. ' +
                        'The folder must exist before this tool is called; this tool does not create directories. ' +
                        'Create the target folder first when scaffolding a new Fiori project. ' +
                        'Typically this is the same folder later passed as the project target to `generate_fiori_app_odata`.'
                }
            }
        });
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

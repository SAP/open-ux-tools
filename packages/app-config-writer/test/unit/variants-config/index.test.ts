import { join } from 'path';
import { generateVariantsConfig } from '../../../src';

describe('Test generateVariantsConfig()', () => {
    test('Add config to the project', async () => {
        const basePath = join(__dirname, '../../fixtures/variants-config/simple-app');
        const fs = await generateVariantsConfig(basePath);

        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({
            'name': 'simple-app',
            'scripts': {
                'start-variants-management': `fiori run --open \"preview.html?fiori-tools-rta-mode=true&sap-ui-rta-skip-flex-validation=true&sap-ui-xx-condense-changes=true#app-preview\"`
            }
        });
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });
});

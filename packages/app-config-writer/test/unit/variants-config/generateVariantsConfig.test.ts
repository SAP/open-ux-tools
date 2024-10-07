import { join } from 'path';
import { generateVariantsConfig } from '../../../src';

describe('generateVariantsConfig', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');

    test('add variants configuration to a project', async () => {
        const fs = await generateVariantsConfig(basePath);
        expect(fs.readJSON(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });
});

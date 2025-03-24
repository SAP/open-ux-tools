import { generateCdm } from '../../../src/base/cdm';
import type { TemplateConfig } from '../../../src/base/config';

describe('cdm', () => {
    test('generate cdm without any apps', () => {
        const cdm = generateCdm();
        expect(cdm).toMatchSnapshot();
    });

    test('generate cdm with additional apps', () => {
        const apps = {
            'my-app': {
                title: 'My App',
                url: '/my/app',
                applicationType: 'URL',
                description: 'My App Description',
                additionalInformation: 'SAPUI5.Component=my.app'
            },
            'my-app2': {
                title: 'My App 2',
                url: '/my/app2',
                applicationType: 'URL',
                description: 'My App Description 2',
                additionalInformation: 'SAPUI5.Component=my.app2'
            }
        } as TemplateConfig['apps'];

        const cdm = generateCdm(apps);
        expect(cdm).toMatchSnapshot();
    });
});

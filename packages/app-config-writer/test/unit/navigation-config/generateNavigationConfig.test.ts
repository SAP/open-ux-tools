import { join } from 'node:path';
import { generateInboundNavigationConfig } from '../../../src/navigation-config';

describe('Unit tests for navigation config generation', () => {
    const fixturePath = join(__dirname, '../../fixtures/navigation-config');

    test('generate inbound nav config entries', async () => {
        const appPathNoInbounds = join(fixturePath, '/ui5-app-no-inbounds');
        let fs = await generateInboundNavigationConfig(appPathNoInbounds, {
            semanticObject: 'semanticObject1',
            action: 'action1',
            title: 'title1',
            subTitle: 'subtitle1'
        });
        expect(fs.readJSON(join(appPathNoInbounds, 'webapp', 'manifest.json'))).toMatchSnapshot();

        // Ensure ui5 paraneters escaping is respected
        fs = await generateInboundNavigationConfig(appPathNoInbounds, {
            semanticObject: 'semanticObject1',
            action: 'action1',
            title: '{{title1}}',
            subTitle: '{{subtitle1}}'
        });
        expect(fs.readJSON(join(appPathNoInbounds, 'webapp', 'manifest.json'))).toMatchSnapshot();

        // Inbounds extended
        const appPathInbounds = join(fixturePath, '/ui5-app-inbounds');
        fs = await generateInboundNavigationConfig(appPathInbounds, {
            semanticObject: 'semanticObject2',
            action: 'action2',
            title: 'title2',
            subTitle: 'subtitle2'
        });
        expect(fs.readJSON(join(appPathInbounds, 'webapp', 'manifest.json'))).toMatchSnapshot();

        // Inbound warning exists
        const appPathInboundKeyExists = join(fixturePath, '/ui5-app-inbounds');
        await expect(() =>
            generateInboundNavigationConfig(appPathInboundKeyExists, {
                semanticObject: 'semanticObject1',
                action: 'action1',
                title: 'title2',
                subTitle: 'subtitle2'
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"An inbound definition already exists for key: semanticObject1-action1. Choose another key."`
        );

        // Inbounds override, should be replaced
        const appPathInboundsExist = join(fixturePath, '/ui5-app-inbounds');
        fs = await generateInboundNavigationConfig(
            appPathInboundsExist,
            { semanticObject: 'semanticObject1', action: 'action1', title: 'title3', subTitle: 'subtitle3' },
            true
        );
        expect(fs.readJSON(join(appPathInboundsExist, 'webapp', 'manifest.json'))).toMatchSnapshot();

        // Optional properties not provided
        fs = await generateInboundNavigationConfig(appPathNoInbounds, {
            semanticObject: 'semanticObject1',
            action: 'action1'
        });
        expect(fs.readJSON(join(appPathNoInbounds, 'webapp', 'manifest.json'))).toMatchSnapshot();
    });

    test('manifest not found', async () => {
        const appPathNoInbounds = join(fixturePath, '/not-existing-app');
        await expect(() =>
            generateInboundNavigationConfig(appPathNoInbounds, {
                semanticObject: 'semanticObject1',
                action: 'action1',
                title: 'title1',
                subTitle: 'subtitle1'
            })
        ).rejects.toThrow(/^The `manifest.json` file was not found at path: /);
    });

    test('"sap.app" not defined', async () => {
        const appPathNoInbounds = join(fixturePath, '/sap-app-not-defined');
        await expect(() =>
            generateInboundNavigationConfig(appPathNoInbounds, {
                semanticObject: 'semanticObject1',
                action: 'action1',
                title: 'title1',
                subTitle: 'subtitle1'
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"The \`manifest.json\` file is missing the \`sap.app\` required section."`
        );
    });
});

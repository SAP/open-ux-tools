import { join } from 'path';
import { getLibraryChoices, getProjectChoices } from '../../src/choices';
import { Manifest, ReuseLibType } from '@sap-ux/project-access';

describe('choices utils', () => {
    test('should return project choices', async () => {
        const appResults = [
            {
                appRoot: join(__dirname, '../samples/project1'),
                projectRoot: join(__dirname, '../samples/project1'),
                manifestPath: join(__dirname, '../samples/project1/webapp/manifest.json'),
                manifest: {} as Manifest
            }
        ];

        const projectChoices = await getProjectChoices(appResults);

        expect(projectChoices).toHaveLength(1);
        expect(projectChoices[0].name).toBe('project1');
        expect(projectChoices[0].value).toBe(join(__dirname, '../samples/project1'));
    });

    test('should return library choices', async () => {
        const libResults = [
            {
                name: 'sap.reuse.ex.test.lib.attachmentservice',
                uri: 'sap/reuse/ex/test/lib/attachmentservice',
                path: 'mock/path',
                dependencies: [],
                type: ReuseLibType.Library,
                libRoot: 'root/mock/path',
                description: 'test description'
            }
        ];

        const libraryChoices = await getLibraryChoices(libResults);
        expect(libraryChoices).toHaveLength(1);
        expect(libraryChoices[0].name).toBe('sap.reuse.ex.test.lib.attachmentservice - library - test description');
    });
});

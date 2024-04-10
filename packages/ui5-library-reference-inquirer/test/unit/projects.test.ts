import { join } from 'path';
import { getProjectChoices } from '../../src/projects';
import { Manifest } from '@sap-ux/project-access';

describe('projects utils', () => {
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
    });
});

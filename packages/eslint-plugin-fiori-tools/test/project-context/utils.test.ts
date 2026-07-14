import { dirname, join } from 'node:path';
import { getAppForPath } from '../../src/project-context/utils.js';
import type { ParsedApp } from '../../src/project-context/parser/types.js';
import { fileURLToPath, pathToFileURL } from 'node:url';

describe('Utils', () => {
    describe('getAppForPath', () => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const project = { projectRootPath: join(__dirname, 'test', 'project', 'root', 'path') } as ParsedApp;
        const firstApp: ParsedApp = { ...project, manifest: { ...project.manifest, appId: 'firstApp' } };
        const secondApp: ParsedApp = { ...project, manifest: { ...project.manifest, appId: 'secondApp' } };
        const firstAppUri = pathToFileURL(join(project.projectRootPath, 'firstApp')).toString();
        const secondAppUri = pathToFileURL(join(project.projectRootPath, 'secondApp')).toString();

        it('gets the first app if only one available', () => {
            const app = getAppForPath(
                {
                    [firstAppUri]: firstApp
                },
                join(project.projectRootPath, 'firstApp', 'someFile.json')
            );
            expect(app?.manifest.appId).toBe('firstApp');
        });

        it('finds app from multiple apps available', () => {
            const app = getAppForPath(
                {
                    [firstAppUri]: firstApp,
                    [secondAppUri]: secondApp
                },
                join(project.projectRootPath, 'firstApp', 'someFile.json')
            );
            expect(app?.manifest.appId).toBe('firstApp');
        });

        it('does not find app from multiple apps available', () => {
            const app = getAppForPath(
                {
                    [firstAppUri]: firstApp,
                    [secondAppUri]: secondApp
                },
                join(project.projectRootPath, 'thirdApp', 'someFile.json')
            );
            expect(app).toBeUndefined();
        });
    });
});

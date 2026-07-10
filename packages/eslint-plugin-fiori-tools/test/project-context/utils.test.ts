import { join } from 'node:path';
import { getAppForPath } from '../../src/project-context/utils.js';
import type { ParsedApp } from '../../src/project-context/parser/types.js';

describe('Utils', () => {
    describe('getAppForPath', () => {
        const project = { projectRootPath: join('test', 'project', 'root', 'path') } as ParsedApp;
        const firstApp: ParsedApp = { ...project, manifest: { ...project.manifest, appId: 'firstApp' } };
        const secondApp: ParsedApp = { ...project, manifest: { ...project.manifest, appId: 'secondApp' } };

        it('gets the first app if only one available', () => {
            const app = getAppForPath(
                {
                    ['firstApp']: firstApp
                },
                join('dummy', 'non-existent', 'path', 'someFile.json') // path is not checked
            );
            expect(app?.manifest.appId).toBe('firstApp');
        });

        it('finds app from multiple apps available', () => {
            const app = getAppForPath(
                {
                    ['firstApp']: firstApp,
                    ['secondApp']: secondApp
                },
                join(project.projectRootPath, 'firstApp', 'someFile.json')
            );
            expect(app?.manifest.appId).toBe('firstApp');
        });

        it('does not find app from multiple apps available', () => {
            const app = getAppForPath(
                {
                    ['firstApp']: firstApp,
                    ['secondApp']: secondApp
                },
                join(project.projectRootPath, 'thirdApp', 'someFile.json')
            );
            expect(app).toBeUndefined();
        });
    });
});

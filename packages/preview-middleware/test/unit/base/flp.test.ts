import type { ReaderCollection } from '@ui5/fs';
import type { TemplateConfig } from '../../../src/base/flp';
import { FlpSandbox as FlpSandboxUnderTest } from '../../../src/base/flp';
import type { FlpConfig } from '../../../src/types';
import type { MiddlewareUtils } from '@ui5/server';
import { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import express from 'express';
import { tmpdir } from 'os';

class FlpSandbox extends FlpSandboxUnderTest {
    public templateConfig: TemplateConfig;
    public readonly config: FlpConfig;
}

describe('FlpSandbox', () => {
    const mockProject = {
        byGlob: jest.fn().mockReturnValue([
            {
                getPath: () => 'test/changes/myid.change',
                getName: () => 'myid.change',
                getString: () => Promise.resolve(JSON.stringify({ id: 'myId' }))
            }
        ])
    } as unknown as ReaderCollection;
    const mockUtils = {
        getProject() {
            return {
                getSourcePath: () => tmpdir()
            };
        }
    } as unknown as MiddlewareUtils;
    const logger = new ToolsLogger();
    const fixtures = join(__dirname, '../../fixtures');

    describe('constructor', () => {
        test('default (no) config', () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            expect(flp.config.path).toBe('/test/flp.html');
            expect(flp.config.apps).toBeDefined();
            expect(flp.config.apps).toHaveLength(0);
            expect(flp.router).toBeDefined();
        });

        test('advanced config', () => {
            const config: FlpConfig = {
                path: '/my/custom/path',
                apps: [
                    {
                        target: '/other/app',
                        local: './local/path'
                    }
                ]
            };
            const flp = new FlpSandbox(config, mockProject, mockUtils, logger);
            expect(flp.config.path).toBe(config.path);
            expect(flp.config.apps).toEqual(config.apps);
            expect(flp.router).toBeDefined();
        });
    });

    describe('init', () => {
        test('minimal manifest', () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = {
                'sap.app': { id: 'my.id' }
            } as Manifest;
            flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('optional configurations', () => {
            const flp = new FlpSandbox({}, mockProject, mockUtils, logger);
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });

        test('additional apps', () => {
            const flp = new FlpSandbox(
                {
                    apps: [
                        {
                            target: '/simple/app',
                            local: join(fixtures, 'simple-app')
                        },
                        {
                            target: '/yet/another/app',
                            local: join(fixtures, 'multi-app'),
                            intent: {
                                object: 'myObject',
                                action: 'action'
                            }
                        }
                    ]
                },
                mockProject,
                mockUtils,
                logger
            );
            const manifest = {
                'sap.app': { id: 'my.id' }
            } as Manifest;
            flp.init(manifest);
            expect(flp.templateConfig).toMatchSnapshot();
        });
    });

    describe('router', () => {
        let server!: SuperTest<Test>;

        beforeAll(async () => {
            const flp = new FlpSandbox(
                {
                    apps: [
                        {
                            target: '/yet/another/app',
                            local: join(fixtures, 'multi-app')
                        }
                    ]
                },
                mockProject,
                mockUtils,
                logger
            );
            const manifest = JSON.parse(readFileSync(join(fixtures, 'simple-app/webapp/manifest.json'), 'utf-8'));
            flp.init(manifest);

            const app = express();
            app.use(flp.router);

            server = await supertest(app);
        });

        test('test/flp.html', async () => {
            const response = await server.get('/test/flp.html').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('WorkspaceConnector.js', async () => {
            const response = await server.get('/resources/preview/WorkspaceConnector.js').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('GET /preview/api/changes', async () => {
            const response = await server.get('/preview/api/changes').expect(200);
            expect(response.text).toMatchSnapshot();
        });

        test('POST /preview/api/changes', async () => {
            const response = await server
                .post('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ fileName: 'id', fileType: 'ctrl_variant' })
                .expect(200);
            expect(response.text).toMatchInlineSnapshot(`"FILE_CREATED id.ctrl_variant"`);
        });

        test('DELETE /preview/api/changes', async () => {
            const response = await server
                .delete('/preview/api/changes')
                .set('Content-Type', 'application/json')
                .send({ fileName: 'id' })
                .expect(200);
            expect(response.text).toMatchInlineSnapshot(`"FILE_DELETED id.ctrl_variant"`);
        });
    });
});

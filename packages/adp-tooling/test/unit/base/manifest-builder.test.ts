import { jest } from '@jest/globals';
import type { createWorkspace } from '@ui5/fs/resourceFactory';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const configuration = { appName: 'base.app', destination: 'destination' };
const abapConfiguration = { target: { url: 'https://host', client: '100' }, ignoreCertErrors: true };
const ui5Config = {
    findCustomTask: jest.fn<() => { configuration?: Record<string, unknown> } | undefined>(),
    findCustomMiddleware: jest.fn<() => { configuration: { adp?: typeof abapConfiguration } } | undefined>()
};
const readUi5Config = jest.fn<() => Promise<typeof ui5Config>>();
const getVariant = jest.fn<() => Promise<{ id?: unknown }>>();
const getWebappPath = jest.fn<() => Promise<string>>();

const realHelper = await import('../../../src/base/helper.js');
jest.unstable_mockModule('../../../src/base/helper.js', () => ({ ...realHelper, readUi5Config, getVariant }));
jest.unstable_mockModule('@sap-ux/project-access', () => ({ getWebappPath }));

const { getMergedManifest, downloadAppResources } = await import('../../../src/base/manifest-builder.js');

/**
 * Mocks the adaptation module resolved from a project directory.
 *
 * @param name - Unique project name.
 * @param exports - The module's exports.
 * @returns The absolute project path.
 */
function mockTaskModule(name: string, exports: object): string {
    const appPath = resolve('test/test-output/manifest builder # projects', name);
    mockTaskAtPath(appPath, exports);
    return appPath;
}

/**
 * Mocks the ESM entry loaded from the adaptation project.
 *
 * @param appPath Project root.
 * @param exports Task exports.
 */
function mockTaskAtPath(appPath: string, exports: object): void {
    const entry = join(appPath, 'node_modules', '@ui5', 'task-adaptation', 'dist', 'index.js');
    jest.unstable_mockModule(entry, () => exports, { virtual: true });
}

describe('manifest-builder', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        readUi5Config.mockResolvedValue(ui5Config);
        ui5Config.findCustomMiddleware.mockReturnValue({ configuration: { adp: abapConfiguration } });
        getVariant.mockResolvedValue({ id: 'customer.app' });
        getWebappPath.mockResolvedValue(resolve('test/test-output/webapp'));
        ui5Config.findCustomTask.mockReturnValue({ configuration });
    });

    describe.each([
        { name: 'previewManifest', invoke: getMergedManifest, result: { 'sap.app': { id: 'customer.app' } } },
        {
            name: 'downloadAppResources',
            invoke: downloadAppResources,
            result: { files: new Map([['file', Buffer.from('data')]]) }
        }
    ])('$name', ({ name, invoke, result }) => {
        test.each(['named', 'default', 'both'])(
            'invokes the %s export with project configuration and preserves the result',
            async (layout) => {
                const task = jest.fn<() => Promise<object>>().mockResolvedValue(result);
                const fallback = jest.fn<() => Promise<object>>().mockResolvedValue({});
                const defaultTask = Object.assign(jest.fn(), { [name]: layout === 'default' ? task : fallback });
                const exports = {
                    ...(layout !== 'default' && { [name]: task }),
                    ...(layout !== 'named' && { default: defaultTask })
                };
                const appPath = mockTaskModule(name + '-' + layout, exports);

                await expect(invoke(appPath)).resolves.toBe(result);

                expect(readUi5Config).toHaveBeenCalledWith(appPath, 'ui5.yaml');
                expect(ui5Config.findCustomTask).toHaveBeenCalledWith('app-variant-bundler-build');
                expect(ui5Config.findCustomMiddleware).not.toHaveBeenCalled();
                expect(task).toHaveBeenCalledTimes(1);
                expect(task).toHaveBeenCalledWith(
                    {
                        workspace: expect.objectContaining({ byGlob: expect.any(Function) }),
                        options: { configuration, projectNamespace: 'customer/app' }
                    },
                    name === 'downloadAppResources' ? join(appPath, '.context') : undefined
                );
                expect(fallback).not.toHaveBeenCalled();
                expect(defaultTask).not.toHaveBeenCalled();
            }
        );

        test.each([
            { label: 'missing', exports: {} },
            { label: 'missing from default', exports: { default: {} } },
            { label: 'non-callable named', exports: { [name]: 'invalid' } },
            { label: 'non-callable default', exports: { default: { [name]: 'invalid' } } }
        ])('rejects a $label export', async ({ label, exports }) => {
            const appPath = mockTaskModule(name + '-' + label, exports);

            await expect(invoke(appPath)).rejects.toThrow('@ui5/task-adaptation does not export ' + name);
        });

        test('propagates task errors', async () => {
            const error = new Error('Adaptation task failed');
            const task = jest.fn<() => Promise<object>>().mockRejectedValue(error);
            const appPath = mockTaskModule(name + '-error', { [name]: task });

            await expect(invoke(appPath)).rejects.toBe(error);
        });

        test.each([
            { label: 'missing task', buildTask: undefined },
            { label: 'missing configuration', buildTask: {} },
            { label: 'empty configuration', buildTask: { configuration: {} } }
        ])('uses ABAP preview configuration with $label', async ({ label, buildTask }) => {
            ui5Config.findCustomTask.mockReturnValue(buildTask);
            const task = jest.fn<() => Promise<object>>().mockResolvedValue(result);
            const appPath = mockTaskModule(name + '-abap-' + label, { [name]: task });

            await expect(invoke(appPath)).resolves.toBe(result);

            expect(readUi5Config).toHaveBeenCalledWith(appPath, 'ui5.yaml');
            expect(ui5Config.findCustomMiddleware).toHaveBeenCalledWith('fiori-tools-preview');
            expect(task).toHaveBeenCalledWith(
                {
                    workspace: expect.objectContaining({ byGlob: expect.any(Function) }),
                    options: { configuration: { ...abapConfiguration, type: 'abap' }, projectNamespace: 'customer/app' }
                },
                name === 'downloadAppResources' ? join(appPath, '.context') : undefined
            );
            expect(abapConfiguration).not.toHaveProperty('type');
        });

        test.each([undefined, { configuration: {} }])(
            'rejects missing ADP preview configuration: %j',
            async (middleware) => {
                ui5Config.findCustomTask.mockReturnValue(undefined);
                ui5Config.findCustomMiddleware.mockReturnValue(middleware);

                await expect(invoke(resolve('missing-config'))).rejects.toThrow(
                    'Adaptation project has no fiori-tools-preview ADP configuration'
                );
            }
        );

        test.each([undefined, '', 42])('rejects an invalid namespace: %j', async (id) => {
            getVariant.mockResolvedValue({ id });

            await expect(invoke(resolve('missing-namespace'))).rejects.toThrow('Adaptation project has no namespace');
        });

        test('propagates configuration errors', async () => {
            const error = new Error('Invalid UI5 configuration');
            ui5Config.findCustomTask.mockReturnValue(undefined);
            readUi5Config.mockRejectedValue(error);

            await expect(invoke(resolve('missing-config'))).rejects.toBe(error);
        });

        test('propagates workspace errors', async () => {
            const error = new Error('Invalid UI5 project');
            getWebappPath.mockRejectedValue(error);

            await expect(invoke(resolve('invalid-project'))).rejects.toBe(error);
        });

        test.each(['webapp', 'custom sources'])(
            'reads namespaced resources from %s with an in-memory overlay',
            async (folder) => {
                const appPath = await mkdtemp(join(tmpdir(), 'adp-workspace-'));
                try {
                    const webappPath = join(appPath, folder);
                    await mkdir(join(webappPath, 'changes'), { recursive: true });
                    const descriptorPath = join(webappPath, 'manifest.appdescr_variant');
                    const descriptor = JSON.stringify({ id: 'customer.app' });
                    await writeFile(descriptorPath, descriptor);
                    await writeFile(join(webappPath, 'changes', 'test.change'), '{}');
                    getWebappPath.mockResolvedValue(webappPath);
                    const task = jest.fn(async ({ workspace }: { workspace: ReturnType<typeof createWorkspace> }) => {
                        const resources = await workspace.byGlob('/resources/customer/app/**/*');
                        expect(resources.map((resource) => resource.getPath()).sort()).toEqual([
                            '/resources/customer/app/changes/test.change',
                            '/resources/customer/app/manifest.appdescr_variant'
                        ]);
                        const resource = resources.find((item) => item.getName() === 'manifest.appdescr_variant');
                        if (!resource) {
                            throw new Error('Missing app descriptor variant');
                        }
                        expect(await resource.getString()).toBe(descriptor);
                        await workspace.write(resource);
                        await writeFile(descriptorPath, 'updated on disk');
                        const [overlaidResource] = await workspace.byGlob(
                            '/resources/customer/app/manifest.appdescr_variant'
                        );
                        expect(await overlaidResource.getString()).toBe(descriptor);
                        expect(await readFile(descriptorPath, 'utf8')).toBe('updated on disk');
                        return result;
                    });
                    mockTaskAtPath(appPath, { [name]: task });

                    await expect(invoke(appPath)).resolves.toBe(result);

                    expect(getWebappPath).toHaveBeenCalledWith(appPath);
                    expect(getVariant).toHaveBeenCalledWith(appPath);
                    expect(task).toHaveBeenCalledTimes(1);
                } finally {
                    await rm(appPath, { recursive: true, force: true });
                }
            }
        );

        test('propagates descriptor errors', async () => {
            const error = new Error('Invalid app descriptor variant');
            getVariant.mockRejectedValue(error);

            await expect(invoke(resolve('invalid-descriptor'))).rejects.toBe(error);
        });

        test('propagates module resolution errors', async () => {
            await expect(invoke(resolve('missing-module'))).rejects.toThrow('Cannot find module');
        });
    });
});

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { resolveContainedPath } from './capture-app.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.properties': 'text/plain'
};

/** Run the supplied app unchanged against the actual local provider; never contact its backend. */
export async function startFinancePreview({
    app,
    config = 'ui5-mock.yaml',
    hostRoot = resolve(root, '../open-ux-odata-mock-data-generator-spi'),
    generatorOptions = {},
    fetchAssets = fetch
}) {
    const appRoot = await realpath(app);
    const configPath = await resolveContainedPath(appRoot, config, '--config');
    const webapp = await resolveContainedPath(appRoot, 'webapp', 'webapp');
    const document = parse(await readFile(configPath, 'utf8'));
    const middleware = document?.server?.customMiddleware ?? [];
    const configuration = middleware.find(({ name }) => name === 'sap-fe-mockserver')?.configuration;
    if (!Array.isArray(configuration?.services)) {
        throw new TypeError('The preview requires configured mock services');
    }
    const ui5 = middleware.find(({ name }) => name === 'fiori-tools-proxy')?.configuration?.ui5;
    const upstream = ui5?.url ? new URL(ui5.url) : undefined;
    if (upstream && (upstream.protocol !== 'https:' || upstream.username || upstream.password)) {
        throw new TypeError('UI5 assets require a credential-free HTTPS origin');
    }
    const FEMockserver = require(join(hostRoot, 'packages/fe-mockserver-core/dist/index.js')).default;
    const FileSystemLoader = require(
        join(hostRoot, 'packages/fe-mockserver-core/dist/plugins/fileSystemLoader.js')
    ).default;
    const Provider = require(join(root, 'packages/mockserver-data-generator/dist/fe-mockserver.cjs'));
    class Loader extends FileSystemLoader {
        async loadJS(path) {
            return path === '@sap-ux/mockserver-data-generator/fe-mockserver' ? Provider : super.loadJS(path);
        }
    }
    const services = await Promise.all(
        configuration.services.map(async (service) => ({
            ...service,
            metadataPath: await resolveContainedPath(
                appRoot,
                service.metadataPath,
                `Metadata for service ${service.urlPath}`
            ),
            mockdataPath: await resolveContainedPath(
                appRoot,
                service.mockdataPath ?? dirname(service.metadataPath),
                `Mockdata for service ${service.urlPath}`,
                { allowMissing: true }
            ),
            mockDataGenerator:
                service.mockDataGenerator === false
                    ? false
                    : {
                          ...service.mockDataGenerator,
                          name: '@sap-ux/mockserver-data-generator/fe-mockserver',
                          options: {
                              pipeline: 'semantic-v2',
                              mode: 'deterministic',
                              rowsPerEntity: 2,
                              ...service.mockDataGenerator?.options,
                              ...generatorOptions
                          }
                      }
        }))
    );
    const originalActivation = process.env.SAP_UX_MOCKGEN_ENABLED;
    process.env.SAP_UX_MOCKGEN_ENABLED = '1';
    const restoreActivation = () => {
        if (originalActivation === undefined) delete process.env.SAP_UX_MOCKGEN_ENABLED;
        else process.env.SAP_UX_MOCKGEN_ENABLED = originalActivation;
    };
    let host;
    try {
        host = new FEMockserver({
            fileLoader: Loader,
            annotations: [],
            ...configuration,
            services
        });
    } catch (error) {
        restoreActivation();
        throw error;
    }
    const observations = [];
    const router = host.getRouter();
    const server = createServer((request, response) => {
        response.on('finish', () =>
            observations.push({ method: request.method, path: request.url?.split('?')[0], status: response.statusCode })
        );
        try {
            router(request, response, () => {
                void (async () => {
                    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
                    if (upstream && /^\/(?:resources|test-resources)\//u.test(pathname)) {
                        const version = ui5.version ? `${encodeURIComponent(ui5.version)}/` : '';
                        const result = await fetchAssets(
                            new URL(
                                `${version}${pathname.slice(1)}`,
                                upstream.href.endsWith('/') ? upstream : `${upstream.href}/`
                            ),
                            { signal: AbortSignal.timeout(15000) }
                        );
                        response.statusCode = result.status;
                        response.setHeader(
                            'Content-Type',
                            result.headers.get('content-type') ?? 'application/octet-stream'
                        );
                        for (const header of ['cache-control', 'etag', 'last-modified']) {
                            const value = result.headers.get(header);
                            if (value) response.setHeader(header, value);
                        }
                        response.end(Buffer.from(await result.arrayBuffer()));
                        return;
                    }
                    let path;
                    try {
                        path = await realpath(
                            resolve(webapp, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`)
                        );
                        if (!path.startsWith(`${webapp}${sep}`) || !(await stat(path)).isFile())
                            throw new Error('Not public');
                    } catch {
                        response.statusCode = 404;
                        response.end();
                        return;
                    }
                    response.setHeader('Content-Type', contentTypes[extname(path)] ?? 'application/octet-stream');
                    response.end(await readFile(path));
                })().catch(() => {
                    if (!response.headersSent) response.statusCode = 502;
                    response.end('Preview resource unavailable');
                });
            });
        } catch {
            if (!response.headersSent) response.statusCode = 500;
            response.end('Preview request failed');
        }
    });
    try {
        await host.isReady;
        await new Promise((done, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', done);
        });
    } catch (error) {
        await host.dispose();
        restoreActivation();
        throw error;
    }
    return {
        url: `http://127.0.0.1:${server.address().port}/`,
        ui5Assets: upstream ? 'configured-proxy' : 'unavailable',
        observations,
        async close() {
            try {
                server.closeAllConnections();
                await new Promise((done) => server.close(done));
                await host.dispose();
            } finally {
                restoreActivation();
            }
        }
    };
}

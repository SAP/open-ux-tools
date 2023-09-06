const { join } = require('path');
const { readFileSync } = require('fs');
const { request } = require('http');

const express = require('express');
const { serve } = require('esbuild');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { FlpSandbox } = require('@sap-ux/preview-middleware');
const { ToolsLogger, UI5ToolingTransport } = require('@sap-ux/logger');
const { esbuildOptions } = require('../../../esbuild');
const APP_ROOT = join(__dirname, '..', 'v2', 'webapp');
const PROJECT_ROOT = join(__dirname, '..', 'v2');
getCreateReader().then((createReader) => {
    const log = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'tools-preview' })]
    });
    const app = express();
    const virBasePath = join(PROJECT_ROOT, ' ').trim();
    const rootPath = createReader({
        fsBasePath: PROJECT_ROOT,
        virBasePath: virBasePath
    });
    const flp = new FlpSandbox(
        { path: '/preview', rta: { layer: 'VENDOR' }, intent: { object: 'preview', action: 'app' } },
        rootPath,
        {
            getProject: () => {
                return {
                    getRootPath: () => {
                        return PROJECT_ROOT;
                    },
                    getSourcePath: () => {
                        return APP_ROOT;
                    }
                };
            }
        },
        log
    );

    const ui5Version = ''; //picks latest
    const ui5PublicUrl = 'https://ui5.sap.com';
    const ui5Proxy = createProxyMiddleware({
        target: ui5PublicUrl,
        changeOrigin: true,
        patyhRewrite: { '/resources': ui5Version + '/resources', '/test-resources': ui5Version + '/test-resources' }
    });

    Promise.all([flp.init(getManifest()), serve({ servedir: './dist' }, { ...esbuildOptions })]).then(() => {
        app.use(flp.router);
        app.use('/preview', express.static(APP_ROOT));

        app.use('/resources', ui5Proxy);
        app.use('/test-resources', ui5Proxy);
        app.use('/ui5-adaptation', express.static(join(__dirname, '..', '..', '..', 'dist', 'ui5-adaptation')));
        app.use(express.static(join(__dirname, 'public')));

        app.use((req, res) => {
            const { url, method, headers } = req;
            // redirected following uri for read and delete
            if (
                ['/FioriTools/api/getChanges', '/FioriTools/api/removeChanges'].findIndex((item) =>
                    req.originalUrl.startsWith(item)
                ) > -1
            ) {
                const uri = '/preview/api/changes';
                return res.redirect(301, uri);
            }
            if (url === '/esbuild') {
                req.write = (data) => {
                    req.w.write(new TextEncoder().encode(data));
                    req.w.flush();
                };
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*',
                    Connection: 'keep-alive'
                });
                return clients.push(req);
            }
            const path = ~url.split('/').pop().indexOf('.') ? url : `/index.html`; //for PWA with router
            console.log(path);
            req.pipe(
                request({ hostname: '0.0.0.0', port: 8000, path, method, headers }, (prxRes) => {
                    res.writeHead(prxRes.statusCode, prxRes.headers);
                    prxRes.pipe(res, { end: true });
                }),
                { end: true }
            );
        });
        app.listen(3000, function () {
            console.log('Development server listening on port 3000!\n');
        });
    });
});

function getManifest() {
    const manifestPath = join(APP_ROOT, 'manifest.json');
    const manifest = readFileSync(manifestPath, {
        encoding: 'utf8'
    });
    return JSON.parse(manifest);
}

async function getCreateReader() {
    const { createReader } = await import('@ui5/fs/resourceFactory');
    return createReader;
}

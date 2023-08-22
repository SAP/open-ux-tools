const { join } = require('path');
const { existsSync, promises } = require('fs');
const { request } = require('http');

const express = require('express');
const { serve } = require('esbuild');
const { json } = require('body-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');

const { build } = require('../../../esbuildConfig');
const { esbuildOptions } = require('../esbuild');

const app = express();

const APP_ROOT = join(__dirname, '..', 'test', 'data', 'v2', 'webapp');

app.use(json());

app.use('/preview', express.static(APP_ROOT));

// const ui5Version = '1.93.0';
// const ui5Version = '1.84.5';
const ui5Version = '';
const ui5PublicUrl = 'https://ui5.sap.com';
const ui5Proxy = createProxyMiddleware({
    target: ui5PublicUrl,
    changeOrigin: true,
    pathRewrite: { '/resources': ui5Version + '/resources', '/test-resources': ui5Version + '/test-resources' }
});
app.use('/resources', ui5Proxy);
app.use('/test-resources', ui5Proxy);

/* Configure Fiori Tools API */
// API to write changes to the user's workspace
app.post('/FioriTools/api/writeChanges', express.json(), writeChangesToWorkspace);

// API to get changes from the user's workspace
app.get('/FioriTools/api/getChanges', getChangesFromWorkspace);

// API to delete changes from the user's workspace
app.delete('/FioriTools/api/removeChanges', express.json(), removeChangesFromWorkspace);

app.use('/ui5-adaptation', express.static(join(__dirname, '..', '..', 'control-property-editor-ui5', 'dist')));
app.use('/cpe-common', express.static(join(__dirname, '..', '..', 'control-property-editor-common', 'dist')));
app.use(express.static(join(__dirname, 'public')));
app.use((req, res) => {
    const { url, method, headers } = req;
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

serve({ servedir: './dist' }, { ...esbuildOptions }).then(() => {
    app.listen(3000, function () {
        console.log('Development server listening on port 3000!\n');
    });
});

/**
 * Writes flex changes to the user's workspace
 * @param req HTTP request object
 * @param res HTTP response object
 * @param next Function to call the next request handler in the chain
 */
async function writeChangesToWorkspace(req, res, next) {
    try {
        const data = req.body;
        const fileName = data.fileName;
        const fileType = data.fileType;

        if (fileName && fileType) {
            const path = join(APP_ROOT, 'changes');
            const filePath = join(path, fileName + '.' + fileType);

            if (!existsSync(path)) {
                await promises.mkdir(path);
            }
            await promises.writeFile(filePath, JSON.stringify(data, null, 2));
            const message = `FILE_CREATED ${fileName}.${fileType}`;
            res.status(200).send(message);
        } else {
            const message = 'INVALID_DATA';
            res.status(400).send(message);
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Gets all changes from the user's workspace
 * @param req HTTP request object
 * @param res HTTP response object
 * @param next Function to call the next request handler in the chain
 */
async function getChangesFromWorkspace(req, res, next) {
    try {
        const path = join(APP_ROOT, 'changes');
        const changes = {};

        if (existsSync(path)) {
            const files = await promises.readdir(path);

            for (let i = 0; i < files.length; i++) {
                const filePath = join(path, files[i]);
                const fileContent = await promises.readFile(filePath, { encoding: 'utf8' });
                changes['sap.ui.fl.' + files[i].split('.')[0]] = JSON.parse(fileContent);
            }
            res.status(200).send(changes);
        } else {
            res.status(200).send(changes);
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Removes all changes from the user's workspace
 * @param req HTTP request object
 * @param res HTTP response object
 * @param next Function to call the next request handler in the chain
 */
async function removeChangesFromWorkspace(req, res, next) {
    try {
        const path = join(APP_ROOT, 'changes');
        const fileName = req.body.fileName.replace('sap.ui.fl.', '');

        if (existsSync(path)) {
            const files = await promises.readdir(path);
            const file = files.find((element) => {
                return element.indexOf(fileName) !== -1;
            });

            if (file) {
                const filePath = join(path, file);
                await promises.unlink(filePath);
                res.sendStatus(200);
            } else {
                const message = 'INVALID_DATA';
                res.status(400).send(message);
            }
        } else {
            const message = 'INVALID_DATA';
            res.status(400).send(message);
        }
    } catch (error) {
        next(error);
    }
}

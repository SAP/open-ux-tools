import globalSetup from './src/global-setup';
import type { Server } from 'http';
import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'node:path';
import { getPortPromise } from 'portfinder';
import { YamlDocument, YAMLMap } from '@sap-ux/yaml';

let abapServer: Server | null = null;

/**
 * Start ABAP mock server for given folder and port.
 */
export async function startAbapServer(folderName: string, port = 3050): Promise<number> {
    if (abapServer) {
        return port;
    }
    abapServer = await globalSetup(port, folderName);
    console.log(`ABAP server started (folder=${folderName}, port=${port})`);
    return port;
}

/**
 * Stop ABAP mock server if running.
 */
export async function stopAbapServer(): Promise<void> {
    if (abapServer) {
        abapServer.close();
        abapServer = null;
        console.log('ABAP server stopped');
    }
}

/**
 * Convenience to stop all servers (expandable).
 */
export async function stopAllServers(): Promise<void> {
    await stopAbapServer();
}

/*
CLI: start UI5 server for a generated project based on test name:
  node server.js <testName>
Behavior:
 - looks into manual-test/<testName> for a project folder that starts with "fiori"
 - reads ui5.yaml inside that folder to extract a desired port (http://localhost:PORT or port: PORT)
 - tries to use that port; if occupied, picks a free port and updates ui5.yaml replacing occurrences of the original port
 - starts `npx ui5 serve --config=ui5.yaml --port=PORT` in that project folder
*/
if (require.main === module) {
    (async () => {
        const testNameArg = process.argv[2];
        if (!testNameArg) {
            console.error('Usage: node server.js <testName>');
            process.exit(1);
        }
        const testName = testNameArg.endsWith('.spec.ts') ? testNameArg.slice(0, -8) : testNameArg;
        const baseFolder = join(__dirname, 'manual-test', testName);

        if (!existsSync(baseFolder)) {
            console.error(`Project folder not found: ${baseFolder}`);
            process.exit(2);
        }

        // find project folder starting with 'fiori'
        const entries = await readdir(baseFolder, { withFileTypes: true });
        const fioriCandidate = entries
            .filter((e) => e.isDirectory() && e.name.startsWith('fiori'))
            .map((e) => e.name)[0];
        const adpCandidate = entries.filter((e) => e.isDirectory() && e.name.startsWith('adp')).map((e) => e.name)[0];
        if (!fioriCandidate) {
            console.error(`Base project not found in ${baseFolder}`);
            process.exit(3);
        }
        if (!adpCandidate) {
            console.error(`Adaptation project not found in ${baseFolder}`);
            process.exit(3);
        }

        const projectFolder = join(baseFolder, fioriCandidate);
        const ui5YamlPath = join(projectFolder, 'ui5.yaml');
        if (!existsSync(ui5YamlPath)) {
            console.error(`ui5.yaml not found in project folder: ${projectFolder}`);
            process.exit(4);
        }

        const adpProjectFolder = join(baseFolder, adpCandidate);
        const adpUi5YamlPath = join(adpProjectFolder, 'ui5.yaml');
        if (!existsSync(adpUi5YamlPath)) {
            console.error(`ui5.yaml not found in project folder: ${adpProjectFolder}`);
            process.exit(4);
        }

        let yamlText = await readFile(ui5YamlPath, 'utf-8');
        let adpYamlText = await readFile(adpUi5YamlPath, 'utf-8');

        // discover port from ui5.yaml using YamlDocument
        let desiredPort: number | undefined;
        try {
            const doc = await YamlDocument.newInstance(yamlText);
            //const cms = doc.findItem({ path: 'server.customMiddleware' }) as any[];
            const middlewareList = doc.getSequence({ path: 'server.customMiddleware' });
            const backendProxyMiddleware = doc.findItem(
                middlewareList,
                (item: any) => item.name === 'backend-proxy-middleware'
            );
            if (!backendProxyMiddleware) {
                throw new Error('Could not find backend-proxy-middleware');
            }
            const backendConfig = doc.getMap({
                start: backendProxyMiddleware as YAMLMap,
                path: 'configuration'
            });
            const proxyMiddlewareConfig = backendConfig.toJSON() as { url: string };
            if (typeof proxyMiddlewareConfig.url === 'string') {
                const m = proxyMiddlewareConfig.url.match(/localhost:(\d{3,5})/);
                if (m) {
                    desiredPort = Number(m[1]);
                }
            }
        } catch {
            desiredPort = undefined;
        }

        // if no port found, pick default 3050
        if (!desiredPort) {
            desiredPort = 3050;
        }

        // try to reserve desired port
        let portToUse = await getPortPromise({ port: desiredPort, stopPort: desiredPort + 1000 });
        if (portToUse !== desiredPort) {
            console.log(`Desired port ${desiredPort} not available, will use ${portToUse} and update ui5.yaml`);
            // Parse YAML and update backend url in the backend-proxy-middleware configuration
            try {
                const doc = await YamlDocument.newInstance(yamlText);
                // set backend url using path-safe API
                doc.setIn({
                    path: 'server.customMiddleware.4.configuration.backend.url',
                    value: `http://localhost:${portToUse}`
                });
                yamlText = doc.toString();
                await writeFile(ui5YamlPath, yamlText, 'utf-8');

                // adaptation
                const adpDoc = await YamlDocument.newInstance(adpYamlText);
                adpDoc.setIn({
                    path: 'server.customMiddleware.4.configuration.url',
                    value: `http://localhost:${portToUse}`
                });
                adpDoc.setIn({
                    path: 'server.customMiddleware.4.configuration.backend.url',
                    value: `http://localhost:${portToUse}`
                });
                adpDoc.setIn({
                    path: 'server.customMiddleware.2.configuration.adp.target.url',
                    value: `http://localhost:${portToUse}`
                });
                adpYamlText = adpDoc.toString();
                await writeFile(adpUi5YamlPath, adpYamlText, 'utf-8');
                console.log(`Updated ui5.yaml backend URL to use port ${portToUse}`);
            } catch (err) {
                console.error('Failed to update ui5.yaml:', err);
                process.exit(6);
            }
        } else {
            console.log(`Using desired port ${desiredPort}`);
            portToUse = desiredPort;
        }
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await stopAllServers();
            process.exit(0);
        });
        startAbapServer(join('manual-test', testName), portToUse).catch((err) => {
            console.error('Failed to start ABAP server:', err);
            process.exit(5);
        });
    })();
}

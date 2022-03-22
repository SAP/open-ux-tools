//@ts-ignore
import { projectPreprocessor } from '@ui5/project';
//@ts-ignore
import { middlewareRepository, server } from '@ui5/server';
//@ts-ignore
import { default as mockServer } from 'mock-http-server';
import { join } from 'path';
//@ts-ignore
import { stopUI5Server, stopMockServer } from '../testUtils';
//@ts-ignore
import { default as requestPromise } from 'request-promise';
import * as utils from '../../src/base/utils';

const middlewaresPath = join(__dirname, '..', '..', 'src', 'ui5');
const projectPath = join(__dirname, '..', '..', 'test', 'test-input');
middlewareRepository.addMiddleware({
    name: 'ui5-proxy-middleware',
    specVersion: '1.0',
    middlewarePath: join(middlewaresPath, 'middleware')
});
const baseTree = {
    id: 'ui5-tooling',
    path: projectPath,
    version: '1.0.0',
    dependencies: [],
    server: {}
};
jest.setTimeout(15000);

describe('Test start of server with middleware', () => {
    let serverResponse: any;
    let httpServer: any;
    const hostname = 'http://localhost';
    let port = 8080;
    const cwd = process.cwd();

    beforeAll(async () => {
        httpServer = new mockServer({ host: 'localhost', port: 3333 }, {});
        httpServer.start(() => {
            console.log('Http Mock Server started');
        });

        const projectTree = await projectPreprocessor.processTree(baseTree);
        projectTree.server.customMiddleware = [
            {
                name: 'ui5-proxy-middleware',
                afterMiddleware: 'compression',
                configuration: {
                    ui5: [
                        {
                            path: '/resources',
                            url: 'http://localhost:3333',
                            version: '1.90.0'
                        },
                        {
                            path: '/test-resources',
                            url: 'http://localhost:3333',
                            version: '1.90.0'
                        }
                    ]
                }
            }
        ];
        const serverOptions = {
            port: 8080,
            changePortIfInUse: true
        };
        try {
            process.chdir(projectPath);
            serverResponse = await server.serve(projectTree, serverOptions);
            port = serverResponse.port;
            console.log('Server started on port ' + port);
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    afterAll(async () => {
        process.chdir(cwd);
        try {
            await stopUI5Server(serverResponse);
            console.log('Server stopped on port ' + serverResponse.port);
        } catch (e) {
            console.log(e);
        }
        try {
            await stopMockServer(httpServer);
        } catch (e) {
            console.log(e);
        }
    });

    test('test request ui5 resources', async () => {
        httpServer.on({
            method: 'GET',
            path: '/1.90.0/resources',
            reply: {
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ui5: true })
            }
        });
        try {
            const body = await requestPromise(hostname + ':' + port + '/resources');
            const json = JSON.parse(body);
            expect(json.ui5).toBe(true);
        } catch (error) {
            console.error(error);
            expect(true).toBe(false);
        }
    });

    test('test request ui5 test-resources', async () => {
        httpServer.on({
            method: 'GET',
            path: '/1.90.0/test-resources',
            reply: {
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ui5test: true })
            }
        });
        try {
            const body = await requestPromise(hostname + ':' + port + '/test-resources');
            const json = JSON.parse(body);
            expect(json.ui5test).toBe(true);
        } catch (error) {
            console.error(error);
            expect(true).toBe(false);
        }
    });
});
describe('Test start of server with middleware: old configuration', () => {
    let serverResponse: any;
    let httpServer: any;
    const hostname = 'http://localhost';
    let port = 8080;
    const cwd = process.cwd();

    beforeAll(async () => {
        httpServer = new mockServer({ host: 'localhost', port: 3333 }, {});
        httpServer.start(() => {
            console.log('Http Mock Server started');
        });

        const projectTree = await projectPreprocessor.processTree(baseTree);
        projectTree.server.customMiddleware = [
            {
                name: 'ui5-proxy-middleware',
                afterMiddleware: 'compression',
                configuration: {
                    version: '1.90.0',
                    ui5: {
                        path: ['/resources', '/test-resources'],
                        url: 'http://localhost:3333'
                    }
                }
            }
        ];
        const serverOptions = {
            port: 8080,
            changePortIfInUse: true
        };
        try {
            process.chdir(projectPath);
            serverResponse = await server.serve(projectTree, serverOptions);
            port = serverResponse.port;
            console.log('Server started on port ' + port);
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    afterAll(async () => {
        process.chdir(cwd);
        try {
            await stopUI5Server(serverResponse);
            console.log('Server stopped on port ' + serverResponse.port);
        } catch (e) {
            console.log(e);
        }
        try {
            await stopMockServer(httpServer);
        } catch (e) {
            console.log(e);
        }
    });

    test('test request ui5 resources', async () => {
        httpServer.on({
            method: 'GET',
            path: '/1.90.0/resources',
            reply: {
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ui5: true })
            }
        });
        try {
            const body = await requestPromise(hostname + ':' + port + '/resources');
            const json = JSON.parse(body);
            expect(json.ui5).toBe(true);
        } catch (error) {
            console.error(error);
            expect(true).toBe(false);
        }
    });

    test('test request ui5 test-resources', async () => {
        httpServer.on({
            method: 'GET',
            path: '/1.90.0/test-resources',
            reply: {
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ui5test: true })
            }
        });
        try {
            const body = await requestPromise(hostname + ':' + port + '/test-resources');
            const json = JSON.parse(body);
            expect(json.ui5test).toBe(true);
        } catch (error) {
            console.error(error);
            expect(true).toBe(false);
        }
    });
});

describe('Test start of server with middleware: secure=true, debug=true', () => {
    let serverResponse: any;
    let projectTree: any;
    const hostname = 'http://localhost';
    let port = 8080;
    const cwd = process.cwd();

    beforeAll(async () => {
        projectTree = await projectPreprocessor.processTree(baseTree);
        projectTree.server.customMiddleware = [
            {
                name: 'ui5-proxy-middleware',
                afterMiddleware: 'compression',
                configuration: {
                    debug: true,
                    secure: true,
                    ui5: []
                }
            }
        ];
        const serverOptions = {
            port: 8080,
            changePortIfInUse: true
        };
        try {
            process.chdir(projectPath);
            serverResponse = await server.serve(projectTree, serverOptions);
            port = serverResponse.port;
            console.log('Server started on port ' + port);
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    afterAll(async () => {
        process.chdir(cwd);
        try {
            await stopUI5Server(serverResponse);
            console.log('Server stopped on port ' + serverResponse.port);
        } catch (e) {
            console.log(e);
        }
    });

    test('start server', async () => {
        const serverOptions = {
            port: 8080,
            changePortIfInUse: true
        };
        try {
            process.chdir(projectPath);
            serverResponse = await server.serve(projectTree, serverOptions);
            console.log('Server started on port ' + port);
            expect(serverResponse).toBeDefined();
        } catch (error) {
            console.error(error);
            throw error;
        }
    });
});

describe('Test start of server with middleware: proxy configuration', () => {
    let serverResponse: any;
    let projectTree: any;
    const hostname = 'http://localhost';
    let port = 8080;
    const cwd = process.cwd();
    const hpaMock = jest.fn();
    jest.mock('https-proxy-agent', () => {
        return { HttpsProxyAgent: hpaMock };
    });

    beforeAll(async () => {
        projectTree = await projectPreprocessor.processTree(baseTree);
        projectTree.server.customMiddleware = [
            {
                name: 'ui5-proxy-middleware',
                afterMiddleware: 'compression',
                configuration: {
                    proxy: 'my.proxy.example:12345',
                    ui5: [
                        {
                            path: '/resources',
                            url: 'http://localhost:3333',
                            version: '1.90.0'
                        },
                        {
                            path: '/test-resources',
                            url: 'http://localhost:3333',
                            version: '1.90.0'
                        }
                    ]
                }
            }
        ];
    });
    test('start server with proxy', async () => {
        const serverOptions = {
            port: 8080,
            changePortIfInUse: true
        };
        try {
            process.chdir(projectPath);
            serverResponse = await server.serve(projectTree, serverOptions);
            console.log('Server started on port ' + port);
            expect(serverResponse).toBeDefined();
            expect(hpaMock).toBeCalled();
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    afterAll(async () => {
        process.chdir(cwd);
        jest.clearAllMocks();
        jest.restoreAllMocks();
        try {
            await stopUI5Server(serverResponse);
            console.log('Server stopped on port ' + serverResponse.port);
        } catch (e) {
            console.log(e);
        }
    });
});

describe('Test start of server with middleware', () => {
    let serverResponse: any;
    const hostname = 'http://localhost';
    let port = 8080;
    const cwd = process.cwd();

    beforeAll(async () => {
        const projectTree = await projectPreprocessor.processTree(baseTree);
        projectTree.server.customMiddleware = [
            {
                name: 'ui5-proxy-middleware',
                afterMiddleware: 'compression',
                configuration: {
                    directLoad: true,
                    ui5: []
                }
            }
        ];
        const serverOptions = {
            port: 8080,
            changePortIfInUse: true
        };
        try {
            process.chdir(projectPath);
            serverResponse = await server.serve(projectTree, serverOptions);
            port = serverResponse.port;
            console.log('Server started on port ' + port);
        } catch (error) {
            console.error(error);
            throw error;
        }
    });

    afterAll(async () => {
        process.chdir(cwd);
        try {
            await stopUI5Server(serverResponse);
            console.log('Server stopped on port ' + serverResponse.port);
        } catch (e) {
            console.log(e);
        }
    });

    test('test inject UI5 url in html', async () => {
        //@ts-ignore
        const injectScriptsMock = jest.spyOn(utils, 'injectScripts').mockImplementation(async (req, res, next) => {
            res.end();
        });
        try {
            await requestPromise(hostname + ':' + port + '/index.html');
            expect(injectScriptsMock).toBeCalled();
        } catch (error) {
            console.error(error);
            expect(true).toBe(false);
        }
    });
});

import type {
    FrontendActionResult,
    FrontendActionTransport
} from '../../../../../src/tools/run-rta-workflow-step/browser/types.js';
import {
    FrontendActionError,
    callPageAction,
    executeAction,
    getElementContext,
    getODataMetadata,
    getOverlays,
    getPageActions,
    pressInteractive,
    saveChanges,
    startRta,
    startVisualization,
    stopRta
} from '../../../../../src/tools/run-rta-workflow-step/rta/commands.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = 'http://localhost:8080/test/adaptation-editor.html';
const FRAME = 'preview';

const ok = <T>(payload: T): FrontendActionResult<T> => ({
    isSuccess: true,
    payload,
    error: null
});
const fail = (code: string, message: string): FrontendActionResult<never> => ({
    isSuccess: false,
    payload: null,
    error: { code, message }
});

interface FakeTransport extends FrontendActionTransport {
    callFrontendAction: jest.MockedFunction<FrontendActionTransport['callFrontendAction']>;
    fetchViaContext: jest.MockedFunction<FrontendActionTransport['fetchViaContext']>;
    disconnectSite: jest.MockedFunction<FrontendActionTransport['disconnectSite']>;
    stopBrowser: jest.MockedFunction<FrontendActionTransport['stopBrowser']>;
}

function createFakeTransport(): FakeTransport {
    return {
        callFrontendAction: jest.fn(),
        fetchViaContext: jest.fn(),
        disconnectSite: jest.fn().mockResolvedValue(undefined),
        stopBrowser: jest.fn().mockResolvedValue(undefined)
    };
}

describe('rta/commands', () => {
    let transport: FakeTransport;

    beforeEach(() => {
        transport = createFakeTransport();
    });

    test('startRta calls com.sap.ui.flex.startRTA.v1 with empty payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ rtaStarted: true }));
        const result = await startRta(transport, { site: SITE, frameId: FRAME });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.startRTA.v1', {}, FRAME);
        expect(result).toEqual({ rtaStarted: true });
    });

    test('startRta surfaces backend_login_required without throwing', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            ok({ __needsUserAction: 'backend_login_required', message: 'please log in' })
        );
        const result = await startRta(transport, { site: SITE, frameId: FRAME });
        expect(result).toEqual({
            rtaStarted: false,
            needsUserAction: 'backend_login_required',
            message: 'please log in'
        });
    });

    test('startRta still throws on a genuine action failure', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(fail('GENERIC_ERROR', 'boom'));
        await expect(startRta(transport, { site: SITE, frameId: FRAME })).rejects.toThrow(/startRTA/);
    });

    test('getOverlays calls getOverlaysInformation', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            ok({
                overlays: [
                    {
                        overlayId: 'o1',
                        controlId: 'c1',
                        label: 'L',
                        controlType: 'sap.m.Button',
                        parentElementId: null,
                        parentAggregationName: 'content',
                        index: 0,
                        actionIds: ['rename']
                    }
                ],
                actionsCatalog: { rename: { id: 'rename', label: 'Rename', parameters: [] } }
            })
        );
        const result = await getOverlays(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getOverlaysInformation.v1',
            {},
            undefined
        );
        expect(result.overlays).toHaveLength(1);
        expect(result.actionsCatalog).toHaveProperty('rename');
    });

    test('getElementContext requires controlId and actionId in payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            ok({
                elementType: 'sap.m.Button',
                actionParameters: [],
                aggregationsByClass: [],
                availableModels: {},
                actionSpecificContext: {}
            })
        );
        await getElementContext(transport, { site: SITE }, 'control-1', 'rename');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getContext.v1',
            { controlId: 'control-1', actionId: 'rename' },
            undefined
        );
    });

    test('executeAction passes a single payload object with controlId, actionId, payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok(true));
        await executeAction(transport, { site: SITE, frameId: FRAME }, 'control-1', 'rename', { newLabel: 'Hi' });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.callAction.v1',
            { controlId: 'control-1', actionId: 'rename', payload: { newLabel: 'Hi' } },
            FRAME
        );
    });

    test('saveChanges calls saveChanges with empty payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok(true));
        await saveChanges(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.saveChanges.v1',
            {},
            undefined
        );
    });

    test('startVisualization calls startVisualization with empty payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ visualizationStarted: true }));
        const result = await startVisualization(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.startVisualization.v1',
            {},
            undefined
        );
        expect(result).toEqual({ visualizationStarted: true });
    });

    test('an isSuccess=false result throws a FrontendActionError carrying the code', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getElementContext(transport, { site: SITE }, 'x', 'rename')).rejects.toMatchObject({
            name: 'FrontendActionError',
            code: 'CONTROL_NOT_FOUND',
            message: expect.stringContaining('CONTROL_NOT_FOUND')
        });

        transport.callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getElementContext(transport, { site: SITE }, 'x', 'rename')).rejects.toBeInstanceOf(
            FrontendActionError
        );
    });

    test('stopRta(site) disconnects only that site', async () => {
        await stopRta(transport, { site: SITE });
        expect(transport.disconnectSite).toHaveBeenCalledWith(SITE);
        expect(transport.stopBrowser).not.toHaveBeenCalled();
    });

    test('stopRta() with no site stops the transport entirely', async () => {
        await stopRta(transport);
        expect(transport.stopBrowser).toHaveBeenCalledTimes(1);
        expect(transport.disconnectSite).not.toHaveBeenCalled();
    });

    test('getPageActions calls getPageActions action', async () => {
        const registered = [{ id: 'loadData', layer: 'framework', label: 'Load Data', description: '' }];
        const interactive = [{ controlId: 'btn1', controlType: 'sap.m.Button', label: 'Go', kind: 'button' }];
        transport.callFrontendAction.mockResolvedValueOnce(ok({ registered, interactive }));
        const result = await getPageActions(transport, { site: SITE, frameId: FRAME });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.getPageActions.v1', {}, FRAME);
        expect(result.registered).toEqual(registered);
        expect(result.interactive).toEqual(interactive);
    });

    test('callPageAction calls callPageAction action with id', async () => {
        const runResult = { status: 'ok' as const };
        transport.callFrontendAction.mockResolvedValueOnce(ok(runResult));
        const result = await callPageAction(transport, { site: SITE }, 'loadData');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.callPageAction.v1',
            { id: 'loadData' },
            undefined
        );
        expect(result).toEqual(runResult);
    });

    test('pressInteractive calls pressInteractive action with controlId', async () => {
        const runResult = { status: 'ok' as const, note: 'registered actions changed' };
        transport.callFrontendAction.mockResolvedValueOnce(ok(runResult));
        const result = await pressInteractive(transport, { site: SITE, frameId: FRAME }, 'btn1');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.pressInteractive.v1',
            { controlId: 'btn1' },
            FRAME
        );
        expect(result).toEqual(runResult);
    });

    test('FrontendActionError uses GENERIC_ERROR code when error has no code', async () => {
        transport.callFrontendAction.mockResolvedValueOnce({
            isSuccess: false,
            payload: null,
            error: { code: '', message: 'something went wrong' }
        });
        await expect(startRta(transport, { site: SITE })).rejects.toMatchObject({
            name: 'FrontendActionError'
        });
    });

    describe('getODataMetadata', () => {
        const siteOrigin = 'http://localhost:8080';
        const xmlResp = { status: 200, contentType: 'application/xml', body: '<edmx:Edmx><a/></edmx:Edmx>' };

        test('joins a relative trailing-slash URI to <origin>/<uri>$metadata', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            await getODataMetadata(transport, SITE, ['api/recommendation/v1/RecommendationService/']);
            expect(transport.fetchViaContext).toHaveBeenCalledWith(
                SITE,
                `${siteOrigin}/api/recommendation/v1/RecommendationService/$metadata`
            );
        });

        test('does not double-up a leading slash', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            await getODataMetadata(transport, SITE, ['/api/svc/']);
            expect(transport.fetchViaContext).toHaveBeenCalledWith(SITE, `${siteOrigin}/api/svc/$metadata`);
        });

        test('does not append $metadata twice when the URI already ends in it', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            await getODataMetadata(transport, SITE, ['api/svc/$metadata']);
            expect(transport.fetchViaContext).toHaveBeenCalledWith(SITE, `${siteOrigin}/api/svc/$metadata`);
        });

        test('returns formatted EDMX on an xml response', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['api/svc/']);
            expect(out.entries[0]).toMatchObject({ url: 'api/svc/' });
            const entry = out.entries[0];
            expect('metadata' in entry && entry.metadata).toContain('edmx:Edmx');
        });

        test('maps a text/html login response to a per-entry error', async () => {
            transport.fetchViaContext.mockResolvedValue({
                status: 200,
                contentType: 'text/html',
                body: '<html>login</html>'
            });
            const out = await getODataMetadata(transport, SITE, ['api/svc/']);
            expect(out.entries[0]).toHaveProperty('error');
        });

        test('maps a fetch rejection to a per-entry error', async () => {
            transport.fetchViaContext.mockRejectedValue(new Error('No active editor session for this site.'));
            const out = await getODataMetadata(transport, SITE, ['api/svc/']);
            expect(out.entries[0]).toHaveProperty('error');
        });

        test('returns an empty entries array for an empty uris list', async () => {
            const out = await getODataMetadata(transport, SITE, []);
            expect(out).toEqual({ entries: [] });
            expect(transport.fetchViaContext).not.toHaveBeenCalled();
        });

        test('refuses an absolute URI that escapes the editor origin (SSRF guard)', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['http://evil.example.com/x/']);
            expect(out.entries[0]).toHaveProperty('error');
            expect(transport.fetchViaContext).not.toHaveBeenCalled();
        });

        test('refuses a protocol-relative URI that escapes the editor origin (SSRF guard)', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['//evil.example.com/x/']);
            expect(out.entries[0]).toHaveProperty('error');
            expect(transport.fetchViaContext).not.toHaveBeenCalled();
        });

        const bigEdmx = `<edmx:Edmx>${'x'.repeat(100_000)}</edmx:Edmx>`;

        test('returns metadata inline when under the threshold', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], '/tmp/doesnotmatter');
            expect(out.entries[0]).toHaveProperty('metadata');
            expect(out.entries[0]).not.toHaveProperty('metadataFile');
        });

        test('writes to a file and returns metadataFile + sizeBytes when over the threshold', async () => {
            const dir = mkdtempSync(join(tmpdir(), 'md-'));
            try {
                transport.fetchViaContext.mockResolvedValue({
                    status: 200,
                    contentType: 'application/xml',
                    body: bigEdmx
                });
                const out = await getODataMetadata(
                    transport,
                    SITE,
                    ['api/recommendation/v1/RecommendationService/'],
                    dir
                );
                const entry = out.entries[0] as { url: string; metadataFile: string; sizeBytes: number };
                expect(entry.metadataFile).toContain(join('webapp', '.context'));
                expect(entry.sizeBytes).toBeGreaterThan(100_000);
                expect(readFileSync(entry.metadataFile, 'utf-8')).toContain('edmx:Edmx');
                expect(entry).not.toHaveProperty('metadata');
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        });

        test('errors (no inline) when metadata is large but appPath is absent', async () => {
            transport.fetchViaContext.mockResolvedValue({ status: 200, contentType: 'application/xml', body: bigEdmx });
            const out = await getODataMetadata(transport, SITE, ['api/svc/']);
            expect(out.entries[0]).toHaveProperty('error');
            expect((out.entries[0] as { error: string }).error).toMatch(/appPath/i);
            expect(out.entries[0]).not.toHaveProperty('metadata');
        });

        test('sanitises the URI into a safe filename under .context (no path escape)', async () => {
            const dir = mkdtempSync(join(tmpdir(), 'md-'));
            try {
                transport.fetchViaContext.mockResolvedValue({
                    status: 200,
                    contentType: 'application/xml',
                    body: bigEdmx
                });
                const out = await getODataMetadata(transport, SITE, ['/api/svc/$metadata'], dir);
                const entry = out.entries[0] as { metadataFile: string };
                expect(entry.metadataFile).not.toMatch(/[$]/);
                expect(entry.metadataFile.startsWith(join(dir, 'webapp', '.context'))).toBe(true);
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        });
    });
});

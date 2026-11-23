import type {
    FrontendActionResult,
    FrontendActionTransport
} from '../../../../../src/tools/run-rta-workflow-step/browser/types.js';
import {
    FrontendActionError,
    cleanup,
    describeUi,
    executeAction,
    executeUfaAction,
    getElementContext,
    getODataMetadata,
    getOverlays,
    saveChanges,
    startRta,
    stopRta
} from '../../../../../src/tools/run-rta-workflow-step/rta/commands.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

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

// UFA actions (describeUI/executeAction) are reached by requiring ActionHelpers
// directly; the transport normalizes their raw result into the same
// { isSuccess, payload, error } envelope as the Flex actions. `ok`/`fail` above
// already model that envelope, so UFA tests use them directly:
//   - describeUI success → ok(<tree>)                 (payload is the UI tree)
//   - executeAction success → ok(null)                (bare mutation success → null payload)
//   - any failure → fail(code, message)               (isSuccess:false)

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
        expect(transport.callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.startRTA.v1', {}, FRAME, true);
        expect(result).toEqual({ rtaStarted: true });
    });

    test('startRta forwards agentName in the payload when provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ rtaStarted: true }));
        await startRta(transport, { site: SITE, frameId: FRAME }, 'Joule');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.startRTA.v1',
            { agentName: 'Joule' },
            FRAME,
            true
        );
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

    test('cleanup calls cleanup with empty payload when no reason', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ cleaned: true }));
        const result = await cleanup(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.cleanup.v1', {}, undefined);
        expect(result).toEqual({ cleaned: true });
    });

    test('cleanup forwards reason in the payload when provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ cleaned: true }));
        await cleanup(transport, { site: SITE, frameId: FRAME }, 'done');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.cleanup.v1',
            { reason: 'done' },
            FRAME
        );
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

    // --- Unified Frontend Actions (describeUi / executeUfaAction) ---
    // Reached via ActionHelpers; the transport normalizes their raw results into
    // the { isSuccess, payload, error } envelope, so these use ok()/fail().

    test('describeUi calls the UFA describeUI action with navigation-scoped properties and returns a shallow forest', async () => {
        // describeUI returns a FOREST (array of top-level nodes). Deeper than the default
        // depth (2) so trimming is observable: root → section → field.
        const forest = [
            {
                id: 'root',
                type: 'objectPage',
                children: [{ id: 'section', type: 'section', children: [{ id: 'field', type: 'input' }] }]
            }
        ];
        transport.callFrontendAction.mockResolvedValueOnce(ok(forest));
        const result = await describeUi(transport, { site: SITE, frameId: FRAME });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.describeUI',
            { includedProperties: ['id', 'text', 'Type'] },
            FRAME
        );
        // Default (unscoped) call trims each top-level node to depth 2: the section is kept
        // but its children are replaced by a truncated marker so the model knows to drill in.
        expect(result).toEqual([
            {
                id: 'root',
                type: 'objectPage',
                children: [{ id: 'section', type: 'section', truncated: true, childCount: 1 }]
            }
        ]);
    });

    test('describeUi forwards rootElementId alongside the navigation-scoped properties and returns the subtree at full depth', async () => {
        const subtree = [{ id: 'sub', type: 'section', children: [{ id: 'field', type: 'input' }] }];
        transport.callFrontendAction.mockResolvedValueOnce(ok(subtree));
        const result = await describeUi(transport, { site: SITE }, 'sub');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.describeUI',
            { includedProperties: ['id', 'text', 'Type'], rootElementId: 'sub' },
            undefined
        );
        // A scoped drill-down returns the subtree untrimmed (no truncated markers).
        expect(result).toEqual(subtree);
    });

    test('describeUi throws FrontendActionError when the action fails', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(fail('UFA_ACTION_FAILED', 'Control not found: sub'));
        await expect(describeUi(transport, { site: SITE }, 'sub')).rejects.toMatchObject({
            name: 'FrontendActionError',
            message: expect.stringContaining('Control not found: sub')
        });
    });

    test('executeUfaAction maps a successful press to isSuccess:true', async () => {
        // The transport normalizes a bare mutation success to a null payload.
        transport.callFrontendAction.mockResolvedValueOnce(ok(null));
        const result = await executeUfaAction(transport, { site: SITE, frameId: FRAME }, 'press', 'go-btn');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.executeAction',
            { actionName: 'press', elementId: 'go-btn' },
            FRAME
        );
        expect(result.isSuccess).toBe(true);
        expect(result.result).toBeNull();
    });

    test('executeUfaAction maps a failed press to isSuccess:false and surfaces the error reason', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            fail('UFA_ACTION_FAILED', "Control does not support 'press' action")
        );
        const result = await executeUfaAction(transport, { site: SITE }, 'press', 'label-1');
        expect(result.isSuccess).toBe(false);
        // The failure reason lives in the envelope's error, not payload — it must be surfaced.
        expect(result.result).toMatchObject({ message: "Control does not support 'press' action" });
    });

    test('executeUfaAction forwards actionParameters when provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ success: true }));
        await executeUfaAction(transport, { site: SITE }, 'setValue', 'field-1', { value: 'X' });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.executeAction',
            { actionName: 'setValue', elementId: 'field-1', actionParameters: { value: 'X' } },
            undefined
        );
    });

    test('executeUfaAction omits elementId from the params when not provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ success: true }));
        await executeUfaAction(transport, { site: SITE }, 'refresh');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.executeAction',
            { actionName: 'refresh' },
            undefined
        );
    });

    test('executeUfaAction falls back to payload when a failure carries no error', async () => {
        // isSuccess:false with error:null — the result should fall back to payload.
        transport.callFrontendAction.mockResolvedValueOnce({
            isSuccess: false,
            payload: { note: 'nothing happened' },
            error: null
        });
        const result = await executeUfaAction(transport, { site: SITE }, 'press', 'x');
        expect(result.isSuccess).toBe(false);
        expect(result.result).toEqual({ note: 'nothing happened' });
    });

    describe('getODataMetadata', () => {
        const siteOrigin = 'http://localhost:8080';
        const APP = '/tmp/app';
        const xmlResp = { status: 200, contentType: 'application/xml', body: '<edmx:Edmx><a/></edmx:Edmx>' };

        test('joins a relative trailing-slash URI to <origin>/<uri>$metadata', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            await getODataMetadata(transport, SITE, ['api/recommendation/v1/RecommendationService/'], APP);
            expect(transport.fetchViaContext).toHaveBeenCalledWith(
                SITE,
                `${siteOrigin}/api/recommendation/v1/RecommendationService/$metadata`
            );
        });

        test('does not double-up a leading slash', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            await getODataMetadata(transport, SITE, ['/api/svc/'], APP);
            expect(transport.fetchViaContext).toHaveBeenCalledWith(SITE, `${siteOrigin}/api/svc/$metadata`);
        });

        test('does not append $metadata twice when the URI already ends in it', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            await getODataMetadata(transport, SITE, ['api/svc/$metadata'], APP);
            expect(transport.fetchViaContext).toHaveBeenCalledWith(SITE, `${siteOrigin}/api/svc/$metadata`);
        });

        test('returns formatted EDMX on an xml response', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toMatchObject({ url: 'api/svc/' });
            const entry = out.entries[0];
            expect('metadata' in entry && entry.metadata).toContain('edmx:Edmx');
        });

        test.each([199, 300, 401, 500])('rejects HTTP %s even when the body is EDMX', async (status) => {
            transport.fetchViaContext.mockResolvedValue({ ...xmlResp, status });
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toEqual({
                url: 'api/svc/',
                error: expect.stringContaining('status ' + status)
            });
        });

        test.each([200, 500])('rejects an XML error document with HTTP %s', async (status) => {
            transport.fetchViaContext.mockResolvedValue({
                status,
                contentType: 'application/xml',
                body: '<?xml version="1.0"?><error><message>Backend failure</message></error>'
            });
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toEqual({ url: 'api/svc/', error: expect.any(String) });
        });

        test.each([
            '<?xml version="1.0"?><error><!-- <edmx:Edmx/> --></error>',
            '<error><edmx:Edmx/></error>',
            '<?xml version="1.0" <edmx:Edmx/>',
            '<!-- unterminated <edmx:Edmx/>'
        ])('rejects an XML document whose root is not Edmx: %s', async (body) => {
            transport.fetchViaContext.mockResolvedValue({ ...xmlResp, body });
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toEqual({ url: 'api/svc/', error: expect.any(String) });
        });

        test.each([
            '<m:Edmx xmlns:m="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><m:DataServices/></m:Edmx>',
            '<Edmx xmlns="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><DataServices/></Edmx>',
            '<?xml version="1.0"?><!-- metadata --><edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" Version="1.0"><edmx:DataServices/></edmx:Edmx>'
        ])('accepts EDMX with different namespaces and XML preambles: %s', async (body) => {
            transport.fetchViaContext.mockResolvedValue({ ...xmlResp, body });
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toEqual({ url: 'api/svc/', metadata: expect.stringContaining('Edmx') });
        });

        test('keeps a successful entry when another service returns an XML backend error', async () => {
            transport.fetchViaContext
                .mockResolvedValueOnce({
                    status: 500,
                    contentType: 'application/xml',
                    body: '<?xml version="1.0"?><error>Backend failure</error>'
                })
                .mockResolvedValueOnce(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['api/failing/', 'api/working/'], APP);
            expect(out.entries).toEqual([
                { url: 'api/failing/', error: expect.any(String) },
                { url: 'api/working/', metadata: expect.stringContaining('edmx:Edmx') }
            ]);
        });

        test('maps a text/html login response to a per-entry error', async () => {
            transport.fetchViaContext.mockResolvedValue({
                status: 200,
                contentType: 'text/html',
                body: '<html>login</html>'
            });
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toHaveProperty('error');
        });

        test('maps a fetch rejection to a per-entry error', async () => {
            transport.fetchViaContext.mockRejectedValue(new Error('No active editor session for this site.'));
            const out = await getODataMetadata(transport, SITE, ['api/svc/'], APP);
            expect(out.entries[0]).toHaveProperty('error');
        });

        test('returns an empty entries array for an empty uris list', async () => {
            const out = await getODataMetadata(transport, SITE, [], APP);
            expect(out).toEqual({ entries: [] });
            expect(transport.fetchViaContext).not.toHaveBeenCalled();
        });

        test('refuses an absolute URI that escapes the editor origin (SSRF guard)', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['http://evil.example.com/x/'], APP);
            expect(out.entries[0]).toHaveProperty('error');
            expect(transport.fetchViaContext).not.toHaveBeenCalled();
        });

        test('refuses a protocol-relative URI that escapes the editor origin (SSRF guard)', async () => {
            transport.fetchViaContext.mockResolvedValue(xmlResp);
            const out = await getODataMetadata(transport, SITE, ['//evil.example.com/x/'], APP);
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
                expect(entry.metadataFile).toContain(join(dir, '.context'));
                expect(entry.sizeBytes).toBeGreaterThan(100_000);
                expect(readFileSync(entry.metadataFile, 'utf-8')).toContain('edmx:Edmx');
                expect(entry).not.toHaveProperty('metadata');
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        });

        test('bounds the filename for a very long URI so the write does not exceed the name limit', async () => {
            const dir = mkdtempSync(join(tmpdir(), 'md-'));
            try {
                const longUri = `api/${'segment/'.repeat(40)}svc/`; // ~320 chars
                transport.fetchViaContext.mockResolvedValue({
                    status: 200,
                    contentType: 'application/xml',
                    body: bigEdmx
                });
                const out = await getODataMetadata(transport, SITE, [longUri], dir);
                const entry = out.entries[0] as { url: string; metadataFile: string; sizeBytes: number };
                expect(entry).toHaveProperty('metadataFile');
                expect(entry).not.toHaveProperty('error');
                expect(basename(entry.metadataFile).length).toBeLessThanOrEqual(255);
                expect(readFileSync(entry.metadataFile, 'utf-8')).toContain('edmx:Edmx');
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
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
                expect(entry.metadataFile.startsWith(join(dir, '.context'))).toBe(true);
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        });

        test('preserves separate large metadata files for URIs with the same sanitised name', async () => {
            const dir = mkdtempSync(join(tmpdir(), 'md-'));
            try {
                transport.fetchViaContext
                    .mockResolvedValueOnce({ ...xmlResp, body: bigEdmx.replace('xxxxx', 'first') })
                    .mockResolvedValueOnce({ ...xmlResp, body: bigEdmx.replace('xxxxxx', 'second') });
                const out = await getODataMetadata(transport, SITE, ['/api/a-b/', '/api/a_b/'], dir);
                const [first, second] = out.entries;
                if (!('metadataFile' in first) || !('metadataFile' in second)) {
                    throw new Error('Expected both services to return metadata files');
                }
                expect(first.metadataFile).not.toBe(second.metadataFile);
                expect(readFileSync(first.metadataFile, 'utf-8')).toContain('first');
                expect(readFileSync(second.metadataFile, 'utf-8')).toContain('second');

                transport.fetchViaContext.mockResolvedValueOnce({
                    ...xmlResp,
                    body: bigEdmx.replace('xxxxx', 'first')
                });
                const retry = await getODataMetadata(transport, SITE, ['/api/a-b/'], dir);
                expect(retry.entries[0]).toHaveProperty('metadataFile', first.metadataFile);
                expect(readFileSync(second.metadataFile, 'utf-8')).toContain('second');
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        });
    });
});

import {
    getErrorType,
    getErrorMessage,
    getErrorHelp,
    createGALink,
    ERROR_TYPE
} from '../../../../../src/panel/system/utils/errorMapping';
import { initI18n } from '../../../../../src/utils';

// Mocks
const mockGetHelpUrl = jest.fn().mockImplementation((_treeId: any, _path: number[]) => 'https://help.example/node');
jest.mock('@sap-ux/guided-answers-helper', () => ({
    GUIDED_ANSWERS_LAUNCH_CMD_ID: 'ga.launch',
    HELP_TREE: { FIORI_TOOLS: 42 },
    HELP_NODES: { CERTIFICATE_ERROR: 777 },
    getHelpUrl: (...args: any[]) => mockGetHelpUrl(...args)
}));

describe('errorMapping', () => {
    beforeAll(async () => {
        await initI18n();
    });
    describe('getErrorType', () => {
        test('matches CERT_SELF_SIGNED', () => {
            expect(getErrorType({ code: 'SELF_SIGNED_CERT_IN_CHAIN' })).toBe(ERROR_TYPE.CERT_SELF_SIGNED);
        });
        test('matches CERT_UKNOWN_OR_INVALID by message', () => {
            expect(getErrorType({ message: 'unable to get local issuer certificate' })).toBe(
                ERROR_TYPE.CERT_UKNOWN_OR_INVALID
            );
        });
        test('matches CERT_EXPIRED (code precedence over message)', () => {
            expect(
                getErrorType({
                    code: 'CERT_HAS_EXPIRED',
                    message: 'SELF_SIGNED_CERT_IN_CHAIN'
                })
            ).toBe(ERROR_TYPE.CERT_EXPIRED);
        });
        test('matches CERT_WRONG_HOST', () => {
            expect(getErrorType('ERR_TLS_CERT_ALTNAME_INVALID')).toBe(ERROR_TYPE.CERT_WRONG_HOST);
        });
        test('returns UNKNOWN for unmatched', () => {
            expect(getErrorType({ code: 'SOME_OTHER' })).toBe(ERROR_TYPE.UNKNOWN);
        });
    });

    describe('getErrorMessage', () => {
        test('returns mapped message', () => {
            const msg = getErrorMessage(ERROR_TYPE.CERT_EXPIRED);
            expect(msg).toContain('The system URL is using an expired security certificate.');
        });
        test('falls back for unknown', () => {
            const msg = getErrorMessage(ERROR_TYPE.UNKNOWN);
            expect(msg).toContain('This SAP system failed to return any services.');
        });
    });

    describe('getErrorHelp', () => {
        test('returns mapped help for CERT_SELF_SIGNED', () => {
            const help = getErrorHelp(ERROR_TYPE.CERT_SELF_SIGNED);
            expect(help).toContain('Click here for details on how to use a self-signed security certificate.');
        });
        test('returns default help for unmapped', () => {
            const help = getErrorHelp(ERROR_TYPE.CERT_EXPIRED);
            expect(help).toBe('To fix this issue, follow Guided Answers steps.');
        });
    });

    describe('createGALink', () => {
        test('returns undefined for unmapped error type', () => {
            expect(createGALink(ERROR_TYPE.CERT_EXPIRED)).toBeUndefined();
        });
        test('returns link for mapped error type without command', () => {
            const link = createGALink(ERROR_TYPE.CERT_SELF_SIGNED);
            expect(link).toBeDefined();
            expect(link?.linkText).toBe('Resolve this error');
            expect(link?.subText).toContain('Click here for details on how to use a self-signed security certificate.');
            expect(link?.url).toBe('https://help.example/node');
            expect(link?.command).toBeUndefined();
            expect(mockGetHelpUrl).toHaveBeenCalled();
        });
        test('returns link with command when requested', () => {
            const link = createGALink(ERROR_TYPE.CERT_SELF_SIGNED, true);
            expect(link?.command).toMatchObject({
                id: 'ga.launch',
                params: { treeId: 42, nodeIdPath: [777] }
            });
        });
    });
});

import 'jest-extended';
import { t } from '../../../src/i18n';
import {
    GUIDED_ANSWERS_LAUNCH_CMD_ID,
    HELP_NODES,
    HELP_TREE,
    GUIDED_ANSWERS_ICON
} from '@sap-ux/guided-answers-helper';
import { ErrorHandler, ERROR_TYPE } from '../../../src/error-handler/error-handler';
import type { ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { SampleRate } from '@sap-ux/telemetry';
import { initI18nOdataServiceInquirer } from '../../../src/i18n';
import * as utils from '../../../src/utils';

let mockIsAppStudio = false;

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio)
}));

jest.mock('@sap-ux/feature-toggle', () => ({
    ...jest.requireActual('@sap-ux/feature-toggle'),
    isFeatureEnabled: jest.fn().mockImplementation((featureId) => featureId === 'enableGAIntegration')
}));

jest.mock('../../../src/utils', () => ({
    ...jest.requireActual('../../../src/utils'),
    getPlatform: jest.fn().mockReturnValue({ name: 'CLI', technical: 'CLI' })
}));

describe('Test ErrorHandler', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => (mockIsAppStudio = false));

    test('ErrorHandler stateless functions', () => {
        expect(ErrorHandler.getErrorType('401') === ERROR_TYPE.AUTH).toBe(true);
        expect(ErrorHandler.getErrorType('200') === ERROR_TYPE.AUTH).toBe(false);
        expect(ErrorHandler.getErrorType('301') === ERROR_TYPE.REDIRECT).toBe(true);
        expect(ErrorHandler.getErrorType('200') === ERROR_TYPE.REDIRECT).toBe(false);
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.AUTH)).toEqual(t('errors.authenticationFailed'));
        expect(ErrorHandler.getErrorType(new Error('DEPTH_ZERO_SELF_SIGNED_CERT'))).toEqual(
            ERROR_TYPE.CERT_SELF_SIGNED
        );
        expect(ErrorHandler.getErrorType(new Error('unable to get local issuer certificate'))).toEqual(
            ERROR_TYPE.CERT_UKNOWN_OR_INVALID
        );
        expect(ErrorHandler.getErrorType(new Error('CERT_HAS_EXPIRED'))).toEqual(ERROR_TYPE.CERT_EXPIRED);
        expect(ErrorHandler.isCertError('unable to get local issuer certificate')).toEqual(true);
    });

    test('Maintains last error state', () => {
        const errorHandler = new ErrorHandler();

        expect(errorHandler.getErrorMsg()).toEqual(undefined);
        errorHandler.setCurrentError(ERROR_TYPE.AUTH);

        const authErrorText = t('errors.authenticationFailed', { error: '' });
        expect(errorHandler.getErrorMsg()).toEqual(authErrorText);
        expect(errorHandler.hasError()).toBe(true);
        // Reset error state
        errorHandler.hasError(true);

        expect(errorHandler.getErrorMsg()).toEqual(undefined);
        expect(errorHandler.getErrorMsg({ response: { status: '404' } }, true)).toEqual(t('errors.urlNotFound'));
        expect(errorHandler.getErrorMsg()).toEqual(undefined);
    });

    test('Get current error type', () => {
        const errorHandler = new ErrorHandler();

        expect(errorHandler.getErrorMsg()).toEqual(undefined);
        errorHandler.setCurrentError(ERROR_TYPE.CERT_SELF_SIGNED);

        expect(errorHandler.getCurrentErrorType()).toEqual(ERROR_TYPE.CERT_SELF_SIGNED);
        expect(errorHandler.hasError()).toBe(true);
        // Reset error state
        errorHandler.getCurrentErrorType(true);

        expect(errorHandler.getCurrentErrorType()).toEqual(null);
    });

    test('Test mapErrorToMsg', () => {
        const errorHandler = new ErrorHandler();
        // undefined
        expect(errorHandler.getErrorMsg()).toEqual(undefined);

        // status: 404
        expect(errorHandler.getErrorMsg({ response: { data: { error: { code: '' } }, status: '404' } })).toEqual(
            t('errors.urlNotFound')
        );
        // code: 502
        expect(errorHandler.getErrorMsg({ response: { data: { error: { code: '502' } } } })).toContain(
            t('errors.badGateway')
        );

        // code: 500
        const err = {
            message: 'Request failed with status code 500',
            response: { data: '' },
            code: '500'
        };
        expect(errorHandler.getErrorMsg(err)).toContain(t('errors.internalServerError', { error: err?.message }));

        // TypeError
        expect(errorHandler.getErrorMsg({ name: 'TypeError', message: 'TypeError found' })).toEqual(
            'An error occurred: TypeError found'
        );
    });

    test('getValidationErrorHelp', () => {
        const errorHandler = new ErrorHandler(undefined, true);
        const mockTelemClient = {
            reportEvent: jest.fn()
        } as Partial<ToolsSuiteTelemetryClient> as ToolsSuiteTelemetryClient;
        utils.setTelemetryClient(mockTelemClient);

        expect(errorHandler.getValidationErrorHelp()).toEqual('');
        expect(errorHandler.getValidationErrorHelp(ERROR_TYPE.SERVICES_UNAVAILABLE)).toEqual(
            t('errors.servicesUnavailable')
        );

        mockIsAppStudio = true;
        const serviceUnavailableHelpLink = errorHandler.getValidationErrorHelp(ERROR_TYPE.SERVICES_UNAVAILABLE);
        expect(serviceUnavailableHelpLink).toEqual(
            expect.objectContaining({
                link: {
                    command: expect.objectContaining({
                        id: GUIDED_ANSWERS_LAUNCH_CMD_ID,
                        params: {
                            nodeIdPath: [HELP_NODES.BAS_CATALOG_SERVICES_REQUEST_FAILED],
                            treeId: HELP_TREE.FIORI_TOOLS,
                            trigger: '@sap-ux/odata-service-inquirer'
                        }
                    }),
                    icon: GUIDED_ANSWERS_ICON,
                    text: t('guidedAnswers.validationErrorHelpText'),
                    url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.BAS_CATALOG_SERVICES_REQUEST_FAILED}`
                },
                message: t('errors.servicesUnavailable')
            })
        );
        expect(mockTelemClient.reportEvent).toBeCalledWith(
            {
                eventName: 'GA_LINK_CREATED',
                measurements: {},
                properties: {
                    OperatingSystem: expect.any(String),
                    Platform: expect.any(String),
                    errorType: 'SERVICES_UNAVAILABLE',
                    isGuidedAnswersEnabled: true,
                    nodeIdPath: '48366'
                }
            },
            SampleRate.NoSampling
        );
        (mockTelemClient.reportEvent as jest.Mock).mockClear();

        expect(serviceUnavailableHelpLink?.toString()).toMatchInlineSnapshot(
            `"An error occurred retrieving service(s) for SAP System. Need help with this error? : https://ga.support.sap.com/dtp/viewer/index.html#/tree/3046/actions/48366"`
        );

        // Uses error state if no error provided
        errorHandler.setCurrentError(ERROR_TYPE.SERVICES_UNAVAILABLE);
        expect(errorHandler.getValidationErrorHelp()?.link).toMatchObject(serviceUnavailableHelpLink?.link ?? {});

        // Ensure current state is reset
        expect(errorHandler.getErrorMsg()).toEqual(t('errors.servicesUnavailable'));
        errorHandler.getValidationErrorHelp(undefined, true);
        expect(errorHandler.getErrorMsg()).toEqual(undefined);

        // Ensure command is not generated when GA is not enabled
        ErrorHandler.guidedAnswersEnabled = false;
        const serviceUnavailableHelpNoCommandLink = errorHandler.getValidationErrorHelp(
            ERROR_TYPE.SERVICES_UNAVAILABLE
        );
        expect(serviceUnavailableHelpNoCommandLink).toEqual(
            expect.objectContaining({
                link: {
                    icon: GUIDED_ANSWERS_ICON,
                    text: t('guidedAnswers.validationErrorHelpText'),
                    url: `https://ga.support.sap.com/dtp/viewer/index.html#/tree/${HELP_TREE.FIORI_TOOLS}/actions/${HELP_NODES.BAS_CATALOG_SERVICES_REQUEST_FAILED}`
                },
                message: t('errors.servicesUnavailable')
            })
        );

        expect(mockTelemClient.reportEvent).toBeCalledWith(
            {
                eventName: 'GA_LINK_CREATED',
                measurements: {},
                properties: {
                    OperatingSystem: expect.any(String),
                    Platform: expect.any(String),
                    errorType: 'SERVICES_UNAVAILABLE',
                    isGuidedAnswersEnabled: true,
                    nodeIdPath: '48366'
                }
            },
            SampleRate.NoSampling
        );
        expect(serviceUnavailableHelpNoCommandLink?.toString()).toMatchInlineSnapshot(
            `"An error occurred retrieving service(s) for SAP System. Need help with this error? : https://ga.support.sap.com/dtp/viewer/index.html#/tree/3046/actions/48366"`
        );
    });
});

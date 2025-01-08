import type { HostEnvironmentId } from '@sap-ux/fiori-generator-shared/src/types';
import {
    GUIDED_ANSWERS_ICON,
    GUIDED_ANSWERS_LAUNCH_CMD_ID,
    HELP_NODES,
    HELP_TREE
} from '@sap-ux/guided-answers-helper';
import type { ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { SampleRate } from '@sap-ux/telemetry';
import { AxiosError } from 'axios';
import 'jest-extended';
import { ERROR_TYPE, ErrorHandler } from '../../../src/error-handler/error-handler';
import { initI18nInquirerCommon, t } from '../../../src/i18n';
import * as telemetryUtils from '../../../src/telemetry/telemetry';
import { type Destination } from '@sap-ux/btp-utils';

let mockIsAppStudio = false;

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio)
}));

jest.mock('@sap-ux/feature-toggle', () => ({
    ...jest.requireActual('@sap-ux/feature-toggle'),
    isFeatureEnabled: jest.fn().mockImplementation((featureId) => featureId === 'enableGAIntegration')
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn().mockReturnValue({ name: 'CLI', technical: 'CLI' })
}));

describe('Test ErrorHandler', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nInquirerCommon();
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
        // status: 502
        expect(
            errorHandler.getErrorMsg({
                message: 'Request failed with status code 502',
                response: { data: { error: { code: '502' } } }
            })
        ).toContain(
            t('errors.serverReturnedAnError', {
                errorDesc: 'Bad gateway:',
                errorMsg: 'Request failed with status code 502'
            })
        );

        // code: 500
        const err = {
            message: 'Request failed with status code 500',
            response: { data: '' },
            code: '500'
        };
        expect(errorHandler.getErrorMsg(err)).toContain(
            t('errors.serverReturnedAnError', { errorDesc: 'Internal server error:', errorMsg: err?.message })
        );

        // TypeError
        expect(errorHandler.getErrorMsg({ name: 'TypeError', message: 'TypeError found' })).toEqual(
            'An error occurred: TypeError found'
        );
    });

    test('getValidationErrorHelp', () => {
        ErrorHandler.platform = 'VSCode';
        const errorHandler = new ErrorHandler(undefined, true);
        const mockTelemClient = {
            reportEvent: jest.fn()
        } as Partial<ToolsSuiteTelemetryClient> as ToolsSuiteTelemetryClient;
        telemetryUtils.setTelemetryClient(mockTelemClient);

        expect(errorHandler.getValidationErrorHelp()).toEqual(undefined); // No error provided and no previous error state to use
        expect(errorHandler.getValidationErrorHelp(ERROR_TYPE.SERVICES_UNAVAILABLE)).toEqual(
            t('errors.servicesUnavailable')
        );

        mockIsAppStudio = true;
        ErrorHandler.guidedAnswersTrigger = 'some_ga_trigger_text';
        const serviceUnavailableHelpLink = errorHandler.getValidationErrorHelp(ERROR_TYPE.SERVICES_UNAVAILABLE);
        expect(serviceUnavailableHelpLink).toEqual(
            expect.objectContaining({
                link: {
                    command: expect.objectContaining({
                        id: GUIDED_ANSWERS_LAUNCH_CMD_ID,
                        params: {
                            nodeIdPath: [HELP_NODES.BAS_CATALOG_SERVICES_REQUEST_FAILED],
                            treeId: HELP_TREE.FIORI_TOOLS,
                            trigger: 'some_ga_trigger_text'
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
                    Platform: 'VSCode' as HostEnvironmentId,
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

        // Ensure VSCode GA command is not generated when GA is not enabled
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
                    Platform: 'VSCode' as HostEnvironmentId,
                    errorType: 'SERVICES_UNAVAILABLE',
                    isGuidedAnswersEnabled: true,
                    nodeIdPath: '48366'
                }
            },
            SampleRate.NoSampling
        );
        expect(serviceUnavailableHelpNoCommandLink?.toString()).toEqual(
            'An error occurred retrieving service(s) for SAP System. ' +
                'Need help with this error? : https://ga.support.sap.com/dtp/viewer/index.html#/tree/3046/actions/48366'
        );

        // Destination specific error messages
        const validationMessage = errorHandler.getValidationErrorHelp(ERROR_TYPE.AUTH, false, {
            Name: 'MyDestination',
            Authentication: 'BasicAuthentication',
            'HTML5.DynamicDestination': 'true'
        } as Destination);
        expect(validationMessage).toEqual(
            'Authentication incorrect. Please check the SAP BTP destination authentication configuration.'
        );
    });

    test('Error types should map to specific error messages', () => {
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CERT)).toEqual('A certificate error has occurred');
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CERT, new Error('a cert error'))).toEqual(
            t('errors.certificateError', { errorMsg: 'a cert error' })
        );

        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CERT_EXPIRED)).toEqual(
            'The system URL is using an expired security certificate.'
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CERT_SELF_SIGNED)).toEqual(
            t('errors.urlCertValidationError', { certErrorReason: t('texts.aSelfSignedCert') })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CERT_UKNOWN_OR_INVALID)).toEqual(
            t('errors.urlCertValidationError', { certErrorReason: t('texts.anUnknownOrInvalidCert') })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN)).toEqual(
            t('errors.urlCertValidationError', { certErrorReason: t('texts.anUntrustedRootCert') })
        );

        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.AUTH, (new AxiosError('').status = 401))).toEqual(
            'Authentication incorrect. 401'
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.AUTH_TIMEOUT)).toEqual(t('errors.authenticationTimeout'));

        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.TIMEOUT, new Error('408 Request Timeout'))).toEqual(
            'A connection timeout error occurred: 408 Request Timeout'
        );

        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.INVALID_URL)).toEqual(t('errors.invalidUrl'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CONNECTION)).toEqual(t('errors.connectionError'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.UNKNOWN)).toEqual(t('errors.unknownError'));

        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.SERVICES_UNAVAILABLE)).toEqual(
            t('errors.servicesUnavailable')
        );
        expect(
            ErrorHandler.getErrorMsgFromType(ERROR_TYPE.SERVICE_UNAVAILABLE, new Error('503 Service Unavailable'))
        ).toEqual(t('errors.serverReturnedAnError', { errorDesc: '503 Service Unavailable' }));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CATALOG_SERVICE_NOT_ACTIVE)).toEqual(
            t('errors.catalogServiceNotActive')
        );
        expect(
            ErrorHandler.getErrorMsgFromType(ERROR_TYPE.INTERNAL_SERVER_ERROR, new Error('500 Internal Server Error'))
        ).toEqual(
            t('errors.serverReturnedAnError', {
                errorDesc: t('errors.internalServerError', { errorMsg: '500 Internal Server Error' })
            })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NOT_FOUND)).toEqual(t('errors.urlNotFound'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ODATA_URL_NOT_FOUND)).toEqual(
            t('errors.odataServiceUrlNotFound')
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.BAD_GATEWAY, new Error('502 Bad Gateway'))).toEqual(
            t('errors.serverReturnedAnError', { errorDesc: t('errors.badGateway', { errorMsg: '502 Bad Gateway' }) })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.DESTINATION_UNAVAILABLE)).toEqual(
            t('errors.destination.unavailable')
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.DESTINATION_NOT_FOUND)).toEqual(
            t('errors.destination.notFound')
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.DESTINATION_MISCONFIGURED, 'Some misconfiguration')).toEqual(
            t('errors.destination.misconfigured', { destinationProperty: 'Some misconfiguration' })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_V2_SERVICES)).toEqual(
            t('errors.noServicesAvailable', { version: '2' })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_V4_SERVICES)).toEqual(
            t('errors.noServicesAvailable', { version: '4' })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.DESTINATION_SERVICE_UNAVAILABLE)).toEqual(
            t('errors.destination.unavailable')
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.REDIRECT)).toEqual(t('errors.redirectError'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_SUCH_HOST)).toEqual(t('errors.noSuchHostError'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_ABAP_ENVS)).toEqual(t('errors.abapEnvsUnavailable'));
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.BAD_REQUEST, new Error('400 Bad Request'))).toEqual(
            t('errors.serverReturnedAnError', { errorDesc: t('errors.badRequest', { errorMsg: '400 Bad Request' }) })
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.DESTINATION_CONNECTION_ERROR)).toEqual(
            t('errors.systemConnectionValidationFailed')
        );
        expect(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.SERVER_HTTP_ERROR, new Error('500 Server Error'))).toEqual(
            t('errors.serverReturnedAnError', { errorDesc: '500 Server Error' })
        );
    });
});

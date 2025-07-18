import { ObjectType } from '@sap-ux/ui-service-inquirer';
import type { UiServiceAnswers } from '@sap-ux/ui-service-inquirer';
import { getTelemetryData } from '../src/app/telemetryHelper';
import type { PromptOptions } from '../src/app/types';

describe('TelemetryHelper', () => {
    test('getTelemetryData', () => {
        const telemetryData = getTelemetryData(
            {
                abapCDSView: 'C_GRANTORCLAIMITEMDEX',
                draftEnabled: true,
                launchAppGen: true
            } as UiServiceAnswers,
            undefined
        );
        expect(telemetryData).toStrictEqual({
            ObjectType: ObjectType.CDS_VIEW,
            DraftEnabled: true,
            LaunchAppGen: true
        });
    });

    test('getTelemetryData with BAS storyboard path', () => {
        const telemetryData = getTelemetryData(
            {
                businessObjectInterface: 'I_BANKTP',
                draftEnabled: true,
                launchAppGen: true
            } as UiServiceAnswers,
            {
                path: '/test/to/storyboard'
            } as PromptOptions
        );
        expect(telemetryData).toStrictEqual({
            LaunchSource: 'Storyboard',
            ObjectType: ObjectType.BUSINESS_OBJECT,
            DraftEnabled: true,
            LaunchAppGen: true
        });
    });

    test('getTelemetryData with BAS Service Center data', () => {
        const telemetryData = getTelemetryData(
            {
                businessObjectInterface: 'I_BANKTP',
                draftEnabled: true,
                launchAppGen: true
            } as UiServiceAnswers,
            {
                providerSystem: { name: 'test' }
            } as PromptOptions
        );
        expect(telemetryData).toStrictEqual({
            LaunchSource: 'ServiceCenter',
            ObjectType: ObjectType.BUSINESS_OBJECT,
            DraftEnabled: true,
            LaunchAppGen: true
        });
    });
});

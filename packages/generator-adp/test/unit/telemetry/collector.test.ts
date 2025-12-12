import { PerformanceMeasurementAPI } from '@sap-ux/telemetry';

import { TelemetryCollector } from '../../../src/telemetry/collector';

jest.mock('@sap-ux/telemetry', () => ({
    PerformanceMeasurementAPI: {
        startMark: jest.fn(),
        endMark: jest.fn(),
        measure: jest.fn(),
        getMeasurementDuration: jest.fn()
    }
}));

const mockEndMark = PerformanceMeasurementAPI.endMark as jest.Mock;
const mockMeasure = PerformanceMeasurementAPI.measure as jest.Mock;
const mockStartMark = PerformanceMeasurementAPI.startMark as jest.Mock;
const mockGetMeasurementDuration = PerformanceMeasurementAPI.getMeasurementDuration as jest.Mock;

describe('TelemetryCollector', () => {
    let collector: TelemetryCollector;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with default data', () => {
            collector = new TelemetryCollector();

            expect(collector).toBeInstanceOf(TelemetryCollector);
            expect(collector.telemetryData).toEqual({
                wasExtProjectGenerated: false,
                wasFlpConfigDone: false,
                wasDeployConfigDone: false,
                wasTypeScriptChosen: false
            });
        });
    });

    describe('setBatch', () => {
        beforeEach(() => {
            collector = new TelemetryCollector();
        });

        it('should set multiple properties at once', () => {
            collector.setBatch({
                baseAppTechnicalName: 'test-app-id',
                projectType: 'cloudReady',
                ui5VersionSelected: '1.120.0',
                applicationListLoadingTime: 150.5,
                wasTypeScriptChosen: true
            });

            expect(collector.telemetryData).toEqual(
                expect.objectContaining({
                    baseAppTechnicalName: 'test-app-id',
                    projectType: 'cloudReady',
                    ui5VersionSelected: '1.120.0',
                    applicationListLoadingTime: 150.5,
                    wasTypeScriptChosen: true
                })
            );
        });

        it('should merge with existing data', () => {
            collector.setBatch({
                baseAppTechnicalName: 'initial-app',
                projectType: 'onPremise'
            });

            collector.setBatch({
                projectType: 'cloudReady',
                ui5VersionSelected: '1.120.0'
            });

            expect(collector.telemetryData).toEqual(
                expect.objectContaining({
                    baseAppTechnicalName: 'initial-app',
                    projectType: 'cloudReady',
                    ui5VersionSelected: '1.120.0'
                })
            );
        });
    });

    describe('startTiming', () => {
        beforeEach(() => {
            collector = new TelemetryCollector();
        });

        it('should start timing and store mark name', () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);

            collector.startTiming('applicationListLoadingTime');

            expect(mockStartMark).toHaveBeenCalledWith('applicationListLoadingTime');
            // Verify mark is stored by checking endTiming works
            mockGetMeasurementDuration.mockReturnValue(250.75);
            collector.endTiming('applicationListLoadingTime');
            expect(mockEndMark).toHaveBeenCalledWith(markName);
        });
    });

    describe('endTiming', () => {
        beforeEach(() => {
            collector = new TelemetryCollector();
        });

        it('should end timing and store duration', () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);
            mockGetMeasurementDuration.mockReturnValue(250.75);

            collector.startTiming('applicationListLoadingTime');
            collector.endTiming('applicationListLoadingTime');

            expect(mockEndMark).toHaveBeenCalledWith(markName);
            expect(mockMeasure).toHaveBeenCalledWith(markName);
            expect(mockGetMeasurementDuration).toHaveBeenCalledWith(markName);

            expect(collector.telemetryData).toEqual(
                expect.objectContaining({
                    applicationListLoadingTime: 250.75
                })
            );
        });

        it('should remove mark after ending timing', () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);
            mockGetMeasurementDuration.mockReturnValue(100);

            collector.startTiming('applicationListLoadingTime');
            collector.endTiming('applicationListLoadingTime');

            // Calling endTiming again should not call endMark (mark was removed)
            jest.clearAllMocks();
            collector.endTiming('applicationListLoadingTime');
            expect(mockEndMark).not.toHaveBeenCalled();
        });

        it('should handle endTiming without startTiming', () => {
            collector.endTiming('applicationListLoadingTime');

            expect(mockEndMark).not.toHaveBeenCalled();
            expect(mockMeasure).not.toHaveBeenCalled();
        });
    });
});

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

const mockStartMark = PerformanceMeasurementAPI.startMark as jest.Mock;
const mockEndMark = PerformanceMeasurementAPI.endMark as jest.Mock;
const mockMeasure = PerformanceMeasurementAPI.measure as jest.Mock;
const mockGetMeasurementDuration = PerformanceMeasurementAPI.getMeasurementDuration as jest.Mock;

describe('TelemetryCollector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        TelemetryCollector.init();
    });

    describe('init', () => {
        it('should clear timing marks', () => {
            mockStartMark.mockReturnValue('mark-123');
            TelemetryCollector.startTiming('applicationListLoadingTime');

            TelemetryCollector.init();

            // After init, endTiming should not find the mark
            TelemetryCollector.endTiming('applicationListLoadingTime');
            expect(mockEndMark).not.toHaveBeenCalled();
        });
    });

    describe('setData', () => {
        it('should set string values', () => {
            TelemetryCollector.setData('baseAppTechnicalName', 'test-app-id');
            const data = TelemetryCollector.getData();
            expect(data?.baseAppTechnicalName).toBe('test-app-id');
        });

        it('should overwrite existing values', () => {
            TelemetryCollector.setData('baseAppTechnicalName', 'old-app');
            TelemetryCollector.setData('baseAppTechnicalName', 'new-app');
            const data = TelemetryCollector.getData();
            expect(data?.baseAppTechnicalName).toBe('new-app');
        });
    });

    describe('startTiming', () => {
        it('should start timing for applicationListLoadingTime', () => {
            mockStartMark.mockReturnValue('mark-applicationListLoadingTime-123');
            TelemetryCollector.startTiming('applicationListLoadingTime');

            expect(mockStartMark).toHaveBeenCalledWith('applicationListLoadingTime');
        });

        it('should store the mark name for later use', () => {
            mockStartMark.mockReturnValue('mark-123');
            TelemetryCollector.startTiming('applicationListLoadingTime');

            // Verify mark is stored by calling endTiming
            mockGetMeasurementDuration.mockReturnValue(150.5);
            TelemetryCollector.endTiming('applicationListLoadingTime');

            expect(mockEndMark).toHaveBeenCalledWith('mark-123');
        });
    });

    describe('endTiming', () => {
        it('should complete timing and store duration', () => {
            const markName = 'mark-applicationListLoadingTime-123';
            mockStartMark.mockReturnValue(markName);
            mockGetMeasurementDuration.mockReturnValue(250.75);

            TelemetryCollector.startTiming('applicationListLoadingTime');
            TelemetryCollector.endTiming('applicationListLoadingTime');

            expect(mockEndMark).toHaveBeenCalledWith(markName);
            expect(mockMeasure).toHaveBeenCalledWith(markName);
            expect(mockGetMeasurementDuration).toHaveBeenCalledWith(markName);

            const data = TelemetryCollector.getData();
            expect(data?.applicationListLoadingTime).toBe(250.75);
        });

        it('should remove mark after ending timing', () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);
            mockGetMeasurementDuration.mockReturnValue(100);

            TelemetryCollector.startTiming('applicationListLoadingTime');
            TelemetryCollector.endTiming('applicationListLoadingTime');

            // Second call should not find the mark
            TelemetryCollector.endTiming('applicationListLoadingTime');
            expect(mockEndMark).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple timing measurements', () => {
            const mark1 = 'mark-1';
            const mark2 = 'mark-2';
            mockStartMark.mockReturnValueOnce(mark1).mockReturnValueOnce(mark2);
            mockGetMeasurementDuration.mockReturnValueOnce(100).mockReturnValueOnce(200);

            TelemetryCollector.startTiming('applicationListLoadingTime');
            TelemetryCollector.endTiming('applicationListLoadingTime');
            expect(TelemetryCollector.getData()?.applicationListLoadingTime).toBe(100);

            TelemetryCollector.startTiming('applicationListLoadingTime');
            TelemetryCollector.endTiming('applicationListLoadingTime');
            expect(TelemetryCollector.getData()?.applicationListLoadingTime).toBe(200);
        });
    });

    describe('getData', () => {
        it('should return a copy of the data', () => {
            TelemetryCollector.setData('baseAppTechnicalName', 'test-app');
            const data1 = TelemetryCollector.getData();
            const data2 = TelemetryCollector.getData();

            expect(data1).toEqual(data2);
        });

        it('should return default values for required boolean fields', () => {
            const data = TelemetryCollector.getData();
            expect(data?.wasExtProjectGenerated).toBe(false);
            expect(data?.wasFlpConfigDone).toBe(false);
            expect(data?.wasDeployConfigDone).toBe(false);
            expect(data?.wasTypeScriptChosen).toBe(false);
        });
    });
});

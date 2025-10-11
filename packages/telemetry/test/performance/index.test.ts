import { PerformanceMeasurementAPI } from '../../src/base/performance/api';
import type { Measurement as IMeasurement, PerformanceMeasurement } from '../../src/base/performance/types';
import { EntryType } from '../../src/base/performance/types';

describe('Performance measurement API tests', () => {
    const performance = PerformanceMeasurementAPI;
    const nameStr = 'name';

    beforeEach(() => {
        performance.clearEntries();
    });

    test('Test initTiming property to be set after init', () => {
        expect(typeof performance.initTiming).toEqual('number');
    });

    test('Test .mark method being invoked, during .startMark and .endMark calls', () => {
        const spy = jest.spyOn<PerformanceMeasurement, keyof PerformanceMeasurement>(
            performance,
            'mark' as keyof PerformanceMeasurement
        );
        const markName: string = performance.startMark('name');
        performance.endMark(markName);
        expect(spy).toHaveBeenCalledTimes(2);
    });

    test('Test .getEntriesByName method being invoked, during .measure call', () => {
        const spy = jest.spyOn<PerformanceMeasurement, keyof PerformanceMeasurement>(
            performance,
            'getEntriesByNameType' as keyof PerformanceMeasurement
        );
        const markName: string = performance.startMark(nameStr);
        performance.endMark(markName);
        performance.measure(markName);
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenNthCalledWith(1, markName, EntryType.START_MARK);
        expect(spy).toHaveBeenLastCalledWith(markName, EntryType.END_MARK);
    });

    test('Test .measure method err throw when non-existing markName being passed as param', () => {
        expect(() => {
            performance.measure(nameStr);
        }).toThrow(new Error(`Failed to execute 'measure': mark '${nameStr}' doesn't exist.`));
        const markName = performance.startMark(nameStr);
        expect(() => {
            performance.measure(markName);
        }).toThrow(
            new Error(`Failed to execute 'measure': mark '${markName}'of type '${EntryType.END_MARK}' doesn't exist.`)
        );
    });

    test('Test entries array being populated after .startMark, .endMark, .measure calls', () => {
        const markName: string = performance.startMark(nameStr);
        expect(performance.entries).toHaveLength(1);
        performance.endMark(markName);
        performance.measure(markName);
        expect(performance.entries).toHaveLength(3);
        expect(performance.entries[3]).toBeUndefined();
    });

    test('Test .getEntries returned object', () => {
        const markName: string = performance.startMark(nameStr);
        const expectedArray = performance.getEntriesByName(markName);
        let entries = performance.getEntries();
        expect(entries).toEqual(expectedArray);
        performance.endMark(markName);
        expectedArray.push(performance.getEntriesByNameType(markName, EntryType.END_MARK)[0]);
        entries = performance.getEntries();
        expect(entries).toEqual(expectedArray);
    });

    test('Test .getEntriesByType method', () => {
        expect(performance.getEntriesByType(EntryType.START_MARK)).toEqual([]);
        expect(performance.getEntriesByType(EntryType.END_MARK)).toEqual([]);
        expect(performance.getEntriesByType(EntryType.MEASUREMENT)).toEqual([]);
        const markName: string = performance.startMark(nameStr);
        let expectedArray = performance.getEntries();
        expect(performance.getEntriesByType(EntryType.START_MARK)).toEqual(expectedArray);
        performance.endMark(markName);
        expectedArray = performance.getEntriesByNameType(markName, EntryType.END_MARK);
        expect(performance.getEntriesByType(EntryType.END_MARK)).toEqual(expectedArray);
        performance.measure(markName);
        expectedArray = performance.getEntriesByNameType(markName, EntryType.MEASUREMENT);
        expect(performance.getEntriesByType(EntryType.MEASUREMENT)).toEqual(expectedArray);
    });

    test('Test if measurement type entry duration is calculated correct', () => {
        const markName: string = performance.startMark(nameStr);
        performance.endMark(markName);
        performance.measure(markName);
        const measurementDuration: number = (
            performance.getEntriesByNameType(markName, EntryType.MEASUREMENT).slice(-1)[0] as IMeasurement
        ).getDurationTime();
        const startTime: number = performance.getEntriesByNameType(markName, EntryType.START_MARK)[0].getStartTime();
        const endTime: number = performance.getEntriesByNameType(markName, EntryType.END_MARK)[0].getStartTime();
        const duration: number = endTime - startTime;
        expect(measurementDuration).toEqual(duration);
    });

    test('Test if .getMeasurementDuration returns correct value', () => {
        const markName: string = performance.startMark(nameStr);
        performance.endMark(markName);
        performance.measure(markName);
        const expectedDuration: number = (
            performance.getEntriesByNameType(markName, EntryType.MEASUREMENT)[0] as IMeasurement
        ).duration;
        expect(performance.getMeasurementDuration(markName)).toEqual(expectedDuration);
    });
});

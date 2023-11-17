import { Mark, Measurement } from './entries';
import type { EntriesArray, Mark as IMark, Measurement as IMeasurement } from './types';
import { EntryType, PerformanceMeasurement } from './types';
import performanceNow = require('performance-now');

class PerformanceMeasurementAPI extends PerformanceMeasurement {
    public static initTiming: number;
    private static now: () => number = performanceNow;
    public static entries: EntriesArray = [];

    // reported time is relative to the time the current Node process has started (inferred from process.uptime())

    public static initialize(): void {
        PerformanceMeasurementAPI.initTiming = PerformanceMeasurementAPI.now();
    }

    private static mark(name: string, type: EntryType, timing: number): void {
        const entry = new Mark(name, type, timing);
        PerformanceMeasurementAPI.entries.push(entry);
    }

    public static startMark(name: string): string {
        const timing: number = PerformanceMeasurementAPI.now();
        const extendedName: string = name + timing;
        PerformanceMeasurementAPI.mark(extendedName, EntryType.START_MARK, timing);

        return extendedName;
    }

    public static endMark(name: string): void {
        const timing: number = PerformanceMeasurementAPI.now();
        PerformanceMeasurementAPI.mark(name, EntryType.END_MARK, timing);
    }

    public static measure(markName: string): void {
        const startMark: IMark = PerformanceMeasurementAPI.getEntriesByNameType(markName, EntryType.START_MARK).slice(
            -1
        )[0];
        const endMark: IMark = PerformanceMeasurementAPI.getEntriesByNameType(markName, EntryType.END_MARK).slice(
            -1
        )[0];
        if (!startMark && !endMark) {
            throw new Error(`Failed to execute 'measure': mark '${markName}' doesn't exist.`);
        } else if (!startMark || !endMark) {
            const errMarkType = startMark ? EntryType.END_MARK : EntryType.START_MARK;
            throw new Error(`Failed to execute 'measure': mark '${markName}'of type '${errMarkType}' doesn't exist.`);
        }

        const startTime: number = startMark.getStartTime();
        const endTime: number = endMark.getStartTime();
        const duration = endTime - startTime;
        const measurement = new Measurement(`${markName}`, PerformanceMeasurementAPI.now(), duration);
        PerformanceMeasurementAPI.entries.push(measurement);
    }

    public static getEntries(): EntriesArray {
        return PerformanceMeasurementAPI.entries;
    }

    public static getEntriesByName(name: string): EntriesArray {
        return PerformanceMeasurementAPI.entries.filter((entry) => entry.name === name);
    }

    public static getEntriesByNameType(name: string, type: EntryType): EntriesArray {
        return PerformanceMeasurementAPI.entries.filter((entry) => entry.name === name && entry.type === type);
    }

    public static getEntriesByType(type: EntryType): EntriesArray {
        return PerformanceMeasurementAPI.entries.filter((entry) => entry.type === type);
    }

    public static getMeasurementDuration(name: string): number {
        const entry: IMeasurement = PerformanceMeasurementAPI.getEntriesByNameType(name, EntryType.MEASUREMENT).slice(
            -1
        )[0] as IMeasurement;
        return entry.getDurationTime();
    }

    public static clearEntries(): void {
        PerformanceMeasurementAPI.entries = [];
    }
}

PerformanceMeasurementAPI.initialize();

export { PerformanceMeasurementAPI };

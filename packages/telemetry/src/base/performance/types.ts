enum EntryType {
    START_MARK = 'START_MARK',
    END_MARK = 'END_MARK',
    MEASUREMENT = 'MEASUREMENT'
}

interface Mark {
    type: EntryType;
    name: string;
    startTime: number;
    getStartTime: () => number;
}

interface Measurement extends Mark {
    readonly duration: number;
    getDurationTime: () => number;
}

type EntriesArray = (Mark | Measurement)[];

/**
 *
 */
abstract class PerformanceMeasurement {
    static initTiming: number;
    static enteries: EntriesArray;

    static initialize: () => void;
    static startMark: (name: string) => string;
    static endMark: (name: string) => void;
    static measure: (name: string) => void;
    static getEntries: () => EntriesArray;
    static getEntriesByName: (name: string) => EntriesArray;
    static getEntriesByType: (type: EntryType) => EntriesArray;
    static getEntriesByNameType: (name: string, type: EntryType) => EntriesArray;
    static getMeasurementDuration: (name: string) => number;
    static clearEntries: () => void;
}

export { EntryType, Mark, Measurement, EntriesArray, PerformanceMeasurement };

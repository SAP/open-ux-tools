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
    static readonly initTiming: number;
    static readonly enteries: EntriesArray;

    static readonly initialize: () => void;
    static readonly startMark: (name: string) => string;
    static readonly endMark: (name: string) => void;
    static readonly measure: (name: string) => void;
    static readonly getEntries: () => EntriesArray;
    static readonly getEntriesByName: (name: string) => EntriesArray;
    static readonly getEntriesByType: (type: EntryType) => EntriesArray;
    static readonly getEntriesByNameType: (name: string, type: EntryType) => EntriesArray;
    static readonly getMeasurementDuration: (name: string) => number;
    static readonly clearEntries: () => void;
}

export { EntryType, Mark, Measurement, EntriesArray, PerformanceMeasurement };

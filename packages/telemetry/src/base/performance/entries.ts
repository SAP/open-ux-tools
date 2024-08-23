import type { Measurement as IMeasurement, Mark as IMark } from './types';
import { EntryType } from './types';

/**
 * Repreeents a mark during a performance measurement.
 */
class Mark implements IMark {
    [index: number]: string;
    name: string;
    type: EntryType;

    /**
     * @returns start time in millieseconds
     */
    getStartTime(): number {
        return this.startTime;
    }

    /**
     *
     * @param name Name of mark
     * @param type Mark type
     * @param startTime start time in millieseconds
     */
    constructor(name: string, type: EntryType, readonly startTime: number) {
        this.name = name;
        this.startTime = startTime;
        this.type = type;
    }
}

/**
 * Measurement of execution time length
 */
class Measurement extends Mark implements IMeasurement {
    /**
     *
     * @param name Name of a mark
     * @param startTime start time in millieseconds
     * @param duration time in millieseconds
     */
    constructor(name: string, readonly startTime: number, readonly duration: number) {
        super(name, EntryType.MEASUREMENT, startTime);
        this.duration = duration;
    }

    /**
     * @returns duration in milliseconds
     */
    public getDurationTime(): number {
        return this.duration;
    }
}

export { Mark, Measurement };

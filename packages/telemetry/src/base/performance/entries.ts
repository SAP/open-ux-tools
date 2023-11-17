import type { Measurement as IMeasurement, Mark as IMark } from './types';
import { EntryType } from './types';

class Mark implements IMark {
    [index: number]: string;
    name: string;
    type: EntryType;

    getStartTime(): number {
        return this.startTime;
    }

    constructor(name: string, type: EntryType, readonly startTime: number) {
        this.name = name;
        this.startTime = startTime;
        this.type = type;
    }
}

class Measurement extends Mark implements IMeasurement {
    constructor(name: string, readonly startTime: number, readonly duration: number) {
        super(name, EntryType.MEASUREMENT, startTime);
        this.duration = duration;
    }

    public getDurationTime(): number {
        return this.duration;
    }
}

export { Mark, Measurement };

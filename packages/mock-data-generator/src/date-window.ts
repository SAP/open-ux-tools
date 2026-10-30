import { DEFAULT_REFERENCE_DATE, DEFAULT_WINDOW_YEARS, MAX_WINDOW_YEARS } from './limits.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { t } from './i18n.js';

/**
 * The calendar window deterministic dates are drawn from: `years` calendar years starting at the
 * reference date (UTC midnight). The typed date floor spreads over the whole window, seeded key dates
 * start inside it, and the value banks' dates fall in the years after the reference year.
 */
export interface DateWindow {
    /** The reference date as epoch milliseconds at UTC midnight. */
    readonly startMs: number;
    /** The UTC year of the reference date. */
    readonly startYear: number;
    /** Length of the window in calendar years. */
    readonly years: number;
    /** Length of the window in days, counting leap days. */
    readonly days: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * The year, zero-based month and day of an ISO 8601 calendar date, if it names a real date.
 *
 * @param value candidate `YYYY-MM-DD` date
 * @returns the date parts, or undefined
 */
function calendarDate(value: unknown): Readonly<{ year: number; month: number; day: number }> | undefined {
    const match = typeof value === 'string' ? ISO_DATE.exec(value) : null;
    if (!match) {
        return undefined;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
    const date = new Date(Date.UTC(year, month, day));
    // Date.UTC maps years 0-99 to 1900-1999, and rolls an impossible day into the next month.
    return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
        ? { year, month, day }
        : undefined;
}

/**
 * Reject a date window option outside its documented domain.
 *
 * @param referenceDate the `referenceDate` option, if set
 * @param windowYears the `windowYears` option, if set
 */
export function validateDateWindowOptions(referenceDate: unknown, windowYears: unknown): void {
    if (referenceDate !== undefined && !calendarDate(referenceDate)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, t('options.referenceDate'));
    }
    if (
        windowYears !== undefined &&
        (typeof windowYears !== 'number' ||
            !Number.isSafeInteger(windowYears) ||
            windowYears < 1 ||
            windowYears > MAX_WINDOW_YEARS)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.windowYears', { maximum: MAX_WINDOW_YEARS })
        );
    }
}

/**
 * The date window of validated options; the defaults give 2020-01-01 to 2025-12-31.
 *
 * @param referenceDate first day of the window as `YYYY-MM-DD`; DEFAULT_REFERENCE_DATE when absent
 * @param windowYears length of the window in calendar years; DEFAULT_WINDOW_YEARS when absent
 * @returns the window
 * @example
 * createDateWindow('2024-07-01', 2).days; // 730, from 2024-07-01 to 2026-06-30
 */
export function createDateWindow(
    referenceDate: string = DEFAULT_REFERENCE_DATE,
    windowYears: number = DEFAULT_WINDOW_YEARS
): DateWindow {
    validateDateWindowOptions(referenceDate, windowYears);
    // Validated above.
    const { year, month, day } = calendarDate(referenceDate) as NonNullable<ReturnType<typeof calendarDate>>;
    const startMs = Date.UTC(year, month, day);
    const endMs = Date.UTC(year + windowYears, month, day);
    return Object.freeze({
        startMs,
        startYear: year,
        years: windowYears,
        days: Math.round((endMs - startMs) / MILLISECONDS_PER_DAY)
    });
}

/** The window of the default options. */
export const DEFAULT_DATE_WINDOW = createDateWindow();

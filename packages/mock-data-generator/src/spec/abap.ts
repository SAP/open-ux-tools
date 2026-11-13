/**
 * Character widths of the ABAP Dictionary date and time types as they reach a service as strings (`DATS` 8, `TIMS` 6, a
 * text `TIMESTAMP` 14), completed by the ISO 8601 widths.
 */
export const ABAP_DATS_LENGTH = 8;
/** `TIMS`: `HHMMSS`. */
export const ABAP_TIMS_LENGTH = 6;
/** A `TIMESTAMP` written as digits: `YYYYMMDDHHMMSS`. */
export const ABAP_TIMESTAMP_TEXT_LENGTH = 14;
/** ISO 8601 calendar date, `YYYY-MM-DD`. */
export const ISO_DATE_LENGTH = 10;
/** ISO 8601 time of day, `HH:MM:SS`. */
export const ISO_TIME_LENGTH = 8;
/** ISO 8601 date-time without fraction or offset, `YYYY-MM-DDTHH:MM:SS`. */
export const ISO_DATETIME_LENGTH = 19;

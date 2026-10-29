/**
 * Character widths of the ABAP Dictionary date and time types, as they reach a service as plain
 * strings (ABAP Dictionary built-in types, SAP NetWeaver AS ABAP 7.5x and later, unchanged since).
 *
 * - `DATS`: `YYYYMMDD`, 8 characters.
 * - `TIMS`: `HHMMSS`, 6 characters.
 * - A packed `TIMESTAMP` (`DEC 15`) rendered as text: `YYYYMMDDHHMMSS`, 14 characters.
 *
 * ISO 8601 widths complete the set: `YYYY-MM-DD` (10), `HH:MM:SS` (8) and `YYYY-MM-DDTHH:MM:SS` (19).
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

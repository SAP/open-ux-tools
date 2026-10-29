/**
 * JSON grammar characters (RFC 8259, "The JavaScript Object Notation (JSON) Data Interchange Format").
 *
 * @see https://www.rfc-editor.org/rfc/rfc8259
 */

/** The characters a JSON number can start with: a minus sign or a digit (RFC 8259 section 6). */
export const JSON_NUMBER_START: ReadonlySet<string> = new Set(['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

/**
 * The characters that may follow a backslash in a JSON string, except `u` (RFC 8259 section 7). The row
 * grammar writes characters directly; a `\u` escape could only lead into a dead end (a code point that is
 * not the letter a short string still needs), so it is not offered.
 */
export const JSON_SIMPLE_ESCAPES: ReadonlySet<string> = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

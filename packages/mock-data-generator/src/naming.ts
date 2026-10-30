/**
 * Splitting of technical identifiers (property, entity and parameter names) into words.
 *
 * The rules are written for SAP and CAP naming conventions in English: words are delimited by camel
 * case, underscores, hyphens or whitespace, and only ASCII letters and digits take part in the case
 * boundaries. Identifiers in other scripts are kept whole: a name written in another language yields
 * one token per delimited run, never a translation.
 */

/** How an identifier is split into words. */
export interface IdentifierWordOptions {
    /**
     * Also separate a run of capitals from a following capitalised word, so `HTTPServer` yields
     * `HTTP Server`; without it the run stays joined to the word (`HTTPServer`). Defaults to true.
     * Coherence and key-format rules match whole lowercased names such as `orderid` and were written
     * without this split, so they turn it off.
     */
    splitAcronyms?: boolean;
}

/** How an identifier is split into lowercase tokens. */
export interface IdentifierTokenOptions extends IdentifierWordOptions {
    /**
     * Keep only the ASCII letters of each token and split at every other character, so digits and
     * punctuation never become part of a token (`Date2From` yields `date`, `from`). Defaults to false.
     * Temporal markers are letter-only words, so the temporal planner turns it on.
     */
    lettersOnly?: boolean;
}

/**
 * Split an identifier into its words, keeping their case.
 *
 * @param identifier technical name, for example `SalesOrderID` or `to_Booking`
 * @param options how acronyms are split
 * @returns the non-empty words in order
 * @example
 * identifierWords('BookingStatus_code'); // ['Booking', 'Status', 'code']
 * identifierWords('HTTPServer'); // ['HTTP', 'Server']
 * identifierWords('HTTPServer', { splitAcronyms: false }); // ['HTTPServer']
 */
export function identifierWords(identifier: string, options: IdentifierWordOptions = {}): string[] {
    const acronymsSplit =
        options.splitAcronyms === false ? identifier : identifier.replace(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2');
    return acronymsSplit
        .replace(/([a-z\d])([A-Z])/gu, '$1 $2')
        .replace(/[_-]+/gu, ' ')
        .split(/\s+/u)
        .filter(Boolean);
}

/**
 * Split an identifier into lowercase tokens for matching against vocabularies.
 *
 * @param identifier technical name, for example `SalesOrderID` or `to_Booking`
 * @param options how acronyms, digits and punctuation are treated
 * @returns the non-empty lowercase tokens in order
 * @example
 * identifierTokens('PurchaseOrderID'); // ['purchase', 'order', 'id']
 * identifierTokens('Valid2From', { splitAcronyms: false, lettersOnly: true }); // ['valid', 'from']
 */
export function identifierTokens(identifier: string, options: IdentifierTokenOptions = {}): string[] {
    const tokens = identifierWords(identifier, options).map((word) => word.toLowerCase());
    return options.lettersOnly ? tokens.flatMap((token) => token.split(/[^a-z]+/u)).filter(Boolean) : tokens;
}

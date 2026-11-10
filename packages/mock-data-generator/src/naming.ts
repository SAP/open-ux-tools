/**
 * Splitting of technical identifiers (property, entity and parameter names) into words, following SAP and CAP naming
 * conventions in English. Only ASCII letters and digits take part in case boundaries; identifiers in other scripts are
 * kept whole.
 */

/**
 * The boundary inside a run of capitals before a capitalised word, as in `HTTP|Server`. Replacing it with a space
 * splits acronyms like `replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')` does, but with fixed-width lookarounds that
 * cannot backtrack.
 */
export const ACRONYM_BOUNDARY = /(?<=[A-Z])(?=[A-Z][a-z])/gu;

/** How an identifier is split into words. */
export interface IdentifierWordOptions {
    /**
     * Also separate a run of capitals from a following capitalised word, so `HTTPServer` yields `HTTP Server`. Defaults
     * to true; rules that match whole lowercased names such as `orderid` turn it off.
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
 * @param identifier technical name, for example `DeliveryItemID` or `to_Booking`
 * @param options how acronyms are split
 * @returns the non-empty words in order
 */
export function identifierWords(identifier: string, options: IdentifierWordOptions = {}): string[] {
    const acronymsSplit = options.splitAcronyms === false ? identifier : identifier.replace(ACRONYM_BOUNDARY, ' ');
    return acronymsSplit
        .replace(/([a-z\d])([A-Z])/gu, '$1 $2')
        .replace(/[_-]+/gu, ' ')
        .split(/\s+/u)
        .filter(Boolean);
}

/**
 * Split an identifier into lowercase tokens for matching against vocabularies.
 *
 * @param identifier technical name, for example `DeliveryItemID` or `to_Booking`
 * @param options how acronyms, digits and punctuation are treated
 * @returns the non-empty lowercase tokens in order
 */
export function identifierTokens(identifier: string, options: IdentifierTokenOptions = {}): string[] {
    const tokens = identifierWords(identifier, options).map((word) => word.toLowerCase());
    return options.lettersOnly ? tokens.flatMap((token) => token.split(/[^a-z]+/u)).filter(Boolean) : tokens;
}

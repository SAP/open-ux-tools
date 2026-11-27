/**
 * Splitting of technical identifiers into words, following SAP and CAP naming conventions. Only ASCII letters and
 * digits form case boundaries; identifiers in other scripts are kept whole.
 */

/**
 * The boundary inside a run of capitals before a capitalised word, as in `HTTP|Server`. Fixed-width lookarounds
 * avoid the backtracking of `/([A-Z]+)([A-Z][a-z])/`.
 */
export const ACRONYM_BOUNDARY = /(?<=[A-Z])(?=[A-Z][a-z])/gu;

/** How an identifier is split into words. */
export interface IdentifierWordOptions {
    /** Split `HTTPServer` into `HTTP Server`. Defaults to true. */
    splitAcronyms?: boolean;
}

/** How an identifier is split into lowercase tokens. */
export interface IdentifierTokenOptions extends IdentifierWordOptions {
    /** Split tokens at every character other than an ASCII letter, so `Date2From` yields `date`, `from`. Defaults to false. */
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

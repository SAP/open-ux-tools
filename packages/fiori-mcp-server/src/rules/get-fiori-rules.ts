import fioriRulesContent from './fiori-rules.md';

/**
 * Returns the Fiori rules content bundled at build time.
 *
 * @returns The Fiori rules content as a string
 */
export function getFioriRules(): string {
    return fioriRulesContent;
}

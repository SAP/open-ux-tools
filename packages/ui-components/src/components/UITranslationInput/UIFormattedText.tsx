import React from 'react';
import type { ReactElement } from 'react';

interface MessageTextValues {
    [key: string]: string;
}

export interface UIFormattedTextProps {
    children: string;
    values?: MessageTextValues;
}

interface ParseResult {
    texts: Array<string>;
    bolds: Array<string>;
}

const PLACEHOLDER_START = '{{{';
const PLACEHOLDER_END = '}}}';

/**
 * Method find all matching values.
 *
 * @param text Text to parse.
 * @param values Map with values to search.
 * @returns Array containing matched regex expressions.
 */
const matchAllValues = (text: string, values: MessageTextValues): Array<RegExpExecArray> => {
    const matches = [];
    for (const key in values) {
        const textWithUrlRegex = `${PLACEHOLDER_START}${key}${PLACEHOLDER_END}`;
        const regex = new RegExp(textWithUrlRegex, 'gi');
        let match: RegExpExecArray | null = null;
        do {
            match = regex.exec(text);
            if (match) {
                matches.push(match);
            }
        } while (match);
    }
    return matches;
};

/**
 * Method separates given text between found values and rest unformatted text.
 *
 * @param text Text to parse.
 * @param values Map with values to search.
 * @returns Object containing separated `texts` and `formatted` arrays.
 */
export const parseText = (text: string, values: MessageTextValues): ParseResult => {
    const result: ParseResult = {
        texts: [],
        bolds: []
    };
    if (text) {
        const matches = matchAllValues(text, values);
        matches.sort((match1, match2) => match1.index - match2.index);
        let charIndex = 0;
        if (matches.length) {
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                if (match.index === undefined) {
                    continue;
                }
                const original = match[0];
                const resolvedText = values[original.replace(PLACEHOLDER_START, '').replace(PLACEHOLDER_END, '')];
                result.texts.push(text.substring(charIndex, match.index));
                result.bolds.push(resolvedText);
                charIndex = match.index + original.length;
                if (i === matches.length - 1) {
                    result.texts.push(text.substring(charIndex, text.length));
                }
            }
        } else {
            result.texts.push(text);
        }
    }
    return result;
};

/**
 * Method formats text with callback method to provide option to use different markup to highligh matching result in text.
 *
 * @param text Text to parse.
 * @param values Map with values to search.
 * @param cb Callback method to apply text highlight.
 * @returns Array with formatted text parts.
 */
export function formatTextGeneric<T>(
    text: string,
    values: MessageTextValues,
    cb: (index: number, textPart: string, match?: string) => T
): T[] {
    const parseResult = parseText(text, values);
    const result: T[] = [];
    for (let i = 0; i < parseResult.texts.length; i++) {
        if (!parseResult.texts[i] && !parseResult.bolds[i]) {
            continue;
        }
        result.push(cb(i, parseResult.texts[i], parseResult.bolds[i]));
    }
    return result;
}

/**
 * Method formats string text with replacing matching values with same string without any highlight.
 *
 * @param text Text to parse.
 * @param values Map with values to search.
 * @returns Formatted text string.
 */
export function formatText(text: string, values: MessageTextValues): string {
    const parseResult = formatTextGeneric(text, values, (index: number, textPart: string, match?: string) => {
        return match ? textPart + match : textPart;
    });
    return parseResult.join('');
}

/**
 * Component to show formatted text with highlighting matching entries.
 * Entries with '{{{key}}}' will be replaced with passed value and wrapped in bold.
 *
 * @param props Component properties.
 * @returns Component to render formatted text.
 */
export function UIFormattedText(props: Readonly<UIFormattedTextProps>): ReactElement {
    const { children, values = {} } = props;
    const result = formatTextGeneric<JSX.Element>(
        children,
        values,
        (index: number, textPart: string, match?: string) => {
            return (
                <span key={`anchor-${index}`}>
                    {textPart}
                    {match && <b>{match}</b>}
                </span>
            );
        }
    );

    return <div>{result}</div>;
}

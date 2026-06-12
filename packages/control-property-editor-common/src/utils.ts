export interface PropertiesInfo {
    defaultValue: string;
    description: string;
    propertyName: string;
    type: string;
    propertyType: string | undefined;
}
export interface Properties {
    [key: string]: PropertiesInfo;
}

const isUpperCase = (code: number): boolean => code >= 65 && code <= 90;
const isLowerCase = (code: number): boolean => code >= 97 && code <= 122;
const isWordDelimiter = (code: number): boolean => code === 45 || code === 95 || code === 32; // - or _ or space

const isSentenceCase = (text: string): boolean => {
    if (!text || text.length === 0 || !isUpperCase(text.charCodeAt(0))) {
        return false;
    }
    // Check for PascalCase/camelCase pattern: lowercase followed by uppercase
    // This catches "ToolbarContentMove" but allows "XMLHTTPRequest" (all caps)
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code === 32) {
            return true;
        } else if (code === 45 || code === 95) {
            // Has hyphens or underscores - not sentence case
            return false;
        } else if (i > 0 && isUpperCase(code) && isLowerCase(text.charCodeAt(i - 1))) {
            // Lowercase followed by uppercase = PascalCase/camelCase (e.g., "toolBar", "ToolBar")
            return false;
        }
    }
    // If we get here: either has no spaces (single word or all caps like "XMLHTTPRequest")
    // Treat single words and all-caps as sentence case to avoid conversion
    return true;
};

const isEndOfAbbreviatedWord = (text: string, index: number): boolean => {
    if (index + 2 >= text.length) {
        return false;
    }
    return isUpperCase(text.charCodeAt(index + 1)) && isLowerCase(text.charCodeAt(index + 2));
};

export const convertCamelCaseToPascalCase = (text: string): string => {
    // Early return if already in sentence case
    if (isSentenceCase(text)) {
        return text;
    }

    const words = [];
    let word = '';
    let lookForUpperCase = true;
    for (let i = 0; i < (text ?? '').length; i++) {
        const character = text[i];
        if (lookForUpperCase) {
            // make sure that the first letter is capitalized
            word += word.length === 0 ? character.toUpperCase() : character;
            if (isLowerCase(text.charCodeAt(i + 1))) {
                // First lower case character after upper case character -> switch mode to collect only lower case characters
                lookForUpperCase = false;
            } else if (isEndOfAbbreviatedWord(text, i)) {
                // Next character is the last uppercase character after a sequence of upper case character -> create an abbreviated word
                words.push(word);
                word = '';
            }
        } else if (isUpperCase(text.charCodeAt(i))) {
            // Upper case character indicates the beginning of a new word -> switch mode to detect abbreviated word
            words.push(word);
            lookForUpperCase = true;
            word = character;
        } else if (isWordDelimiter(text.charCodeAt(i))) {
            words.push(word);
            lookForUpperCase = true;
            word = '';
        } else {
            word += character;
        }
    }

    if (word.length) {
        words.push(word);
    }
    return words.join(' ');
};

export enum FlexChangesEndPoints {
    changes = `/preview/api/changes`
}

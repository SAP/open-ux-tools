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

export const convertCamelCaseToPascalCase = (text: string): string => {
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
            } else if (isUpperCase(text.charCodeAt(i + 1)) && isLowerCase(text.charCodeAt(i + 2))) {
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

export const SEPARATOR = /=|:/;
export const COMMENT_START = /#|!/;
export const END_OF_LINE = /\r|\n|\r\n/;
export const WHITESPACE = /[ \t\f]+/;
export const HEX_DIGIT = /[0-9a-fA-F]/;
export const ELEMENT_ESCAPE_MAPPING: Record<string, string> = {
    '\\\\': '\\',
    '\\f': '\f',
    '\\n': '\n',
    '\\r': '\r',
    '\\t': '\t'
};
export const KEY_ESCAPE_MAPPING: Record<string, string> = {
    ...ELEMENT_ESCAPE_MAPPING,
    '\\=': '=',
    '\\:': ':'
};

export const UNICODE_CHARACTER_LENGTH = 4;
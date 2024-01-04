import { Lexer } from 'chevrotain';

import { lexerDefinition } from './tokens';
import { AnnotationParser } from './parser';

export const lexer = new Lexer(lexerDefinition, {
    // Enable validation for debugging
    skipValidations: true
});
export const parser = new AnnotationParser();

export const Visitor = parser.getBaseCstVisitorConstructor();

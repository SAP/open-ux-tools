// provides a "language" according to the eslint documentation (see https://eslint.org/docs/latest/extend/languages) to deal with fiori elements apps
// in contrast to usual eslint languages, this one does not deal only with one file but with a set of files belonging to one app (e.g. manifest.json, annotations, ...)

import {
    File,
    Language,
    LanguageContext,
    LanguageOptions,
    OkParseResult,
    ParseResult,
    SourceCode,
    SourceLocation,
    TraversalStep
} from '@eslint/core';

import { JSONLanguage, JSONOkParseResult, JSONSourceCode } from '@eslint/json';

import { visitorKeys, parse, iterator } from '@humanwhocodes/momoa';

import { createApplicationAccess } from '@sap-ux/project-access';

export class FioriElementsLanguage implements Language {
    // required by eslint
    fileType: 'text';
    lineStart: 0; // | 1;
    columnStart: 0; // | 1;
    nodeTypeKey: 'type'; // 'kind';

    validateLanguageOptions() {
        // TODO implement language features if needed
        // maybe a language option could be used to separate v2 and v4 apps?
    }

    parse(file: File, context: LanguageContext<LanguageOptions>): ParseResult<unknown> {
        // assuming we get the manifest in here
        // potentially this gets more complicated, as the location of the manifest can be configured via ui5.yaml. We might need to read it from project access instead.

        //const appAccess = await createApplicationAccess(file.path);
        //parse(appAccess.app.manifest);

        return {
            ok: true,
            ast: parse(typeof file.body === 'string' ? file.body : new TextDecoder().decode(file.body))
        };
    }

    createSourceCode(
        file: File,
        input: OkParseResult<unknown>,
        context: LanguageContext<LanguageOptions>
    ): SourceCode<{
        LangOptions: LanguageOptions;
        RootNode: unknown;
        SyntaxElementWithLoc: unknown;
        ConfigNode: unknown;
    }> {
        // Return a minimal SourceCode object as a placeholder
        const lang = new JSONLanguage({ mode: 'json' });
        return lang.createSourceCode(file, input as JSONOkParseResult);
    }

    // optional - clarify if needed
    constructor() {
        // TODO implement language features if needed
    }

    //visitorKeys: Object.fromEntries([...visitorKeys]);
    defaultLanguageOptions?: LanguageOptions | undefined;

    //matchesSelectorClass(className: string, node: unknown, ancestry: unknown[]): boolean {}

    //normalizeLanguageOptions(languageOptions: LanguageOptions): LanguageOptions {}
}

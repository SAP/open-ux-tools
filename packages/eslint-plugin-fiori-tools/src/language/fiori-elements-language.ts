// provides a "language" according to the eslint documentation (see https://eslint.org/docs/latest/extend/languages) to deal with fiori elements apps
// in contrast to usual eslint languages, this one does not deal only with one file but with a set of files belonging to one app (e.g. manifest.json, annotations, ...)

import type {
    File,
    Language,
    LanguageContext,
    LanguageOptions,
    OkParseResult,
    ParseResult,
    SourceCode
} from '@eslint/core';
import { JSONLanguage, type JSONOkParseResult } from '@eslint/json';
import { parse } from '@humanwhocodes/momoa';

export class FioriElementsLanguage implements Language {
    // required by eslint
    fileType = 'text' as const;
    lineStart = 1 as const;
    columnStart = 1 as const;
    nodeTypeKey = 'type';

    validateLanguageOptions() {
        // TODO implement language features if needed
        // maybe a language option could be used to separate v2 and v4 apps?
    }

    parse(file: File, context: LanguageContext<LanguageOptions>): ParseResult<unknown> {
        // assuming we get the manifest in here
        // potentially this gets more complicated, as the location of the manifest can be configured via ui5.yaml. We might need to read it from project access instead.

        //const appAccess = await createApplicationAccess(file.path);
        //parse(appAccess.app.manifest);

        const root = parse(typeof file.body === 'string' ? file.body : new TextDecoder().decode(file.body), {
            mode: 'json',
            ranges: true,
            tokens: true,
            allowTrailingCommas: false
        });

        return {
            ok: true,
            ast: root
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

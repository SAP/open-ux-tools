import type { UI5Version } from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';

export interface UI5LibraryAnswers {
    libraryName?: string;
    namespace?: string;
    targetFolder?: string;
    ui5Version?: string;
    enableTypescript?: boolean;
}

export interface UI5LibraryPromptOptions {
    /**
     * Optionally provide the target folder used as the `targetFolder` prompt default value
     */
    targetFolder?: string;
    /**
     * Optionally include an Inquirer Separator for grouped UI5 versions
     */
    includeSeparators?: boolean;
    /**
     * Optionally register the `inquirer-autocomplete-prompt` plugin and use for UI5 version searching
     */
    useAutocomplete?: boolean;
}

export interface UI5VersionChoice extends ListChoiceOptions {
    value: UI5Version;
}

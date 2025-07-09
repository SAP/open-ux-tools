import Generator = require('yeoman-generator');
import { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import type { GeneratorTypes } from '../types';
import type { GeneratorOpts } from '../utils/opts';
import { setHeaderTitle } from '../utils/opts';
import AdpGeneratorLogger from '../utils/logger';

/**
 * Shared base class for all ADP generators.
 *
 * 1. Provides a unified logger that writes both to the Yeoman log and to the generator UI.
 * 2. Handles consistent error display and recovery logic (e.g. CF logout).
 * 3. Takes care of setting the generator title so that the UI always reflects the active generator.
 */
export default class SubGeneratorBase extends Generator {
    /**
     * Instance of the logger.
     */
    public logger: ToolsLogger;
    /**
     * Instance of the app wizard.
     */
    protected readonly appWizard: AppWizard;
    /**
     * The type of generator.
     */
    protected readonly type: GeneratorTypes;
    /**
     * Captures validation errors occurring during construction so they can be surfaced later.
     */
    protected validationError: Error | undefined;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {Generator.GeneratorOptions} opts - The options for the generator.
     * @param {GeneratorTypes} type - The type of generator.
     */
    constructor(args: string | string[], opts: GeneratorOpts, type: GeneratorTypes) {
        super(args, opts);
        this.type = type;
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);

        AdpGeneratorLogger.configureLogging(
            this.options.logger,
            this.rootGeneratorName(),
            this.log,
            this.options.vscode,
            this.options.logLevel,
            this.options.logWrapper
        );
        this.logger = AdpGeneratorLogger.logger as unknown as ToolsLogger;

        setHeaderTitle(opts, this.logger);
    }

    /**
     * Centralized error handler that ensures resources are cleaned up and a helpful
     * error prompt is shown to the user.
     *
     * @param {string} errorMessage - Human-readable error message.
     * @returns {Promise<void>} A promise that resolves when the error is handled.
     */
    protected async handleRuntimeCrash(errorMessage: string): Promise<void> {
        await this.prompt([this._getErrorMessagePrompt(errorMessage)]);
    }

    /**
     * Builds a Yeoman question that simply displays the error message and blocks the wizard.
     *
     * @param {string} errorMessage - Human-readable error message.
     * @returns {YUIQuestion<InputQuestion>} The Yeoman question that displays the error message.
     */
    private _getErrorMessagePrompt(errorMessage: string): YUIQuestion<InputQuestion> {
        return {
            type: 'input',
            name: 'errorMessagePrompt',
            message: 'There is problem with communication with the backend. Please try again later.',
            guiOptions: {
                type: 'label',
                hint: errorMessage
            },
            // Always keep the wizard on this page
            validate: () => false
        };
    }
}

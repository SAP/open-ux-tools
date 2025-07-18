import Generator = require('yeoman-generator');
import type { Prompts } from '@sap-devx/yeoman-ui-types';
import { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../utils/i18n';
import type { GeneratorTypes } from '../types';
import { setHeaderTitle } from '../utils/opts';
import AdpGeneratorLogger from '../utils/logger';
import type { GeneratorOpts } from '../utils/opts';

/**
 * Shared base class for all ADP generators.
 */
export default class SubGeneratorBase extends Generator {
    public setPromptsCallback: (fn: any) => void;
    public prompts: Prompts;

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
     * Stores a callback provided by Yeoman-UI when the <Prompts> instance is not
     * yet created. This ensures the callback is attached once the prompts are
     * available (e.g. after async i18n or system look-ups).
     */
    private pendingPromptsCallback?: (fn: any) => void;

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
        setHeaderTitle(opts, this.logger, this.type);

        this.setPromptsCallback = (fn): void => {
            // Persist callback so we can attach it once prompts are created
            this.pendingPromptsCallback = fn;

            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    /**
     * Helper to create/update the prompts instance. Any pending Yeoman-UI
     * callback that arrived before prompts existed will automatically be
     * attached.
     *
     * @param {Prompts} prompts The newly created Prompts instance.
     */
    protected _registerPrompts(prompts: Prompts): void {
        this.prompts = prompts;
        if (this.pendingPromptsCallback) {
            this.prompts.setCallback(this.pendingPromptsCallback);
        }
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
            message: t('error.backendCommunicationError'),
            guiOptions: {
                type: 'label',
                hint: errorMessage
            },
            validate: () => false // Always keep the wizard on this page
        };
    }
}

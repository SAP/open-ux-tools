import Generator from 'yeoman-generator';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import { type UiServiceGenerator } from './types';
import { prompts, t } from '../utils';
//import { UiServiceAnswers } from '@sap-ux/ui-service-inquirer';

/**
 * Generator for creating a new UI Service.
 *
 * @extends Generator
 */
export default class extends Generator implements UiServiceGenerator {
    //answers: UiServiceAnswers = {};
    answers: any = {};
    prompts: Prompts;
    appWizard: AppWizard;
    vscode: unknown;
    setPromptsCallback: (fn: any) => void;

    /**
     * Constructor for the generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        // Force overwrite of files in case of conflict
        opts.force = true;
        super(args, opts);

        this.appWizard = AppWizard.create(opts);
        this.vscode = opts.vscode;
        // UiServiceGenLogger.configureLogging(
        //     this.options.logger,
        //     this.rootGeneratorName(),
        //     this.log,
        //     this.options.vscode,
        //     this.options.logLevel
        // );

        const steps = prompts;
        // if options.data is present, skip the first step
        // options.data is passeed from BAS service center
        if (this.options.data?.systemName) {
            //this.skipSystemStep = true;
            steps.shift();
        }

        opts.appWizard.setHeaderTitle(t('UI_SERVICE_GENERATOR_TITLE'));
        this.prompts = new Prompts(steps);
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    public async prompting(): Promise<void> {}
}

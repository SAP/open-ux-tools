import { AppWizard } from '@sap-devx/yeoman-ui-types';
import { DeploymentGenerator } from '@sap-ux/deploy-config-generator-shared';

/**
 * ABAP deploy config generator.
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private readonly vscode: unknown;
    private readonly launchDeployConfigAsSubGenerator: boolean;
    private readonly launchStandaloneFromYui?: boolean;

    /**
     * Constructor for the ABAP deploy config generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: any) {
        super(args, opts);
        this.launchDeployConfigAsSubGenerator = opts.launchDeployConfigAsSubGenerator ?? false;
        this.launchStandaloneFromYui = opts.launchStandaloneFromYui;

        this.appWizard = opts.appWizard || AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.options = opts;
    }

    public async initializing(): Promise<void> {
        await this._initializing();
    }

    private async _initializing(): Promise<void> {
        console.log('initializing');
    }

    public async prompting(): Promise<void> {
        console.log('prompting');
    }

    public async writing(): Promise<void> {
        await this._writing();
    }

    private async _writing(): Promise<void> {
        console.log('writing');
    }

    public install(): void {}

    private _install(): void {
        console.log('install');
    }

    public async end(): Promise<void> {
        console.log('end');
    }
}

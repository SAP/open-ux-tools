import { hello } from '../extension';
import Generator from 'yeoman-generator';
import { ToolsLogger } from '@sap-ux/logger';
import {} from '@sap-ux/fiori-elements-writer';

export default class extends Generator {
    private log = new ToolsLogger();

    initializing(): void {
        this.log.info('Example of a simple Fiori elements generator.');
    }

    async prompting(): Promise<void> {}

    async writing(): Promise<void> {}
}

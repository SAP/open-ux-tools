export class MockNodeEnvironment {
    global: string;

    constructor(config: any) {
        this.global = config.globalConfig;
    }

    async setup() {
        console.log('setting up');
    }

    async teardown() {
        console.log('tearing down');
    }

    getVmContext() {
        console.log('retrieve vm context');
    }
}

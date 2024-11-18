import type Generator from 'yeoman-generator';
import { DeploymentGenerator } from '../../src/base/generator';

export default class extends DeploymentGenerator {
    constructor(args: string | string[], options: Generator.GeneratorOptions) {
        super(args, { ...options });
    }

    initializing(): void {
        // for testing
    }

    prompting(): void {
        // for testing
    }

    writing(): void {
        // for testing
    }

    end(): void {
        // for testing
    }
}

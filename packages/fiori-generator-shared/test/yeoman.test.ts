// generate a test for setYeomanEnvConflicterForce

import type { GeneratorOptions } from 'yeoman-generator';
import { setYeomanEnvConflicterForce } from '../src/yeoman';

describe('setYeomanEnvConflicterForce', () => {
    let env: GeneratorOptions['Environment'];

    beforeEach(() => {
        env = {
            conflicter: { force: false },
            conflicterOptions: { force: false }
        } as unknown as GeneratorOptions['Environment'];
    });

    it('should set both conflicter.force and conflicterOptions.force to true when force is not provided', () => {
        setYeomanEnvConflicterForce(env);

        expect(env.conflicter?.force).toBe(true);
        expect(env.conflicterOptions?.force).toBe(true);
    });

    it('should set both conflicter.force and conflicterOptions.force to the provided value (true)', () => {
        setYeomanEnvConflicterForce(env, true);

        expect(env.conflicter?.force).toBe(true);
        expect(env.conflicterOptions?.force).toBe(true);
    });

    it('should set both conflicter.force and conflicterOptions.force to the provided value (false)', () => {
        setYeomanEnvConflicterForce(env, false);

        expect(env.conflicter?.force).toBe(false);
        expect(env.conflicterOptions?.force).toBe(false);
    });

    it('should handle missing conflicter gracefully', () => {
        delete env.conflicter;
        setYeomanEnvConflicterForce(env, true);

        expect(env.conflicterOptions?.force).toBe(true);
    });

    it('should handle missing conflicterOptions gracefully', () => {
        delete env.conflicterOptions;
        setYeomanEnvConflicterForce(env, true);

        expect(env.conflicter?.force).toBe(true);
    });
});

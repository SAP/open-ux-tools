import type { GeneratorOptions } from 'yeoman-generator';

/**
 * Set the Yeoman environment's conflicter force option.
 * Sets both `env.conflicter.force` and `env.conflicterOptions.force` to the provided value.
 * This is to be backward compatible with different Yeoman versions.
 *
 * @param env - Yeoman environment
 * @param force - whether to force overwriting files
 */
export function setYeomanEnvConflicterForce(env: GeneratorOptions['Environment'], force?: boolean): void {
    if (env.conflicter) {
        env.conflicter.force = force ?? true;
    }

    if (env.conflicterOptions) {
        env.conflicterOptions.force = force ?? true;
    }
}

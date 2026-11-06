/**
 * The Yeoman environment's conflicter is an internal, version-variable property that is not
 * part of the public `@yeoman/types` environment interface. This minimal structural type
 * captures only the fields `setYeomanEnvConflicterForce` touches.
 */
interface ConflicterEnv {
    conflicter?: { force?: boolean };
    conflicterOptions?: { force?: boolean };
}

/**
 * Set the Yeoman environment's conflicter force option.
 * Sets both `env.conflicter.force` and `env.conflicterOptions.force` to the provided value.
 * This is to be backward compatible with different Yeoman versions.
 *
 * @param env - Yeoman environment
 * @param force - whether to force overwriting files
 */
export function setYeomanEnvConflicterForce(env: object, force?: boolean): void {
    const conflicterEnv = env as ConflicterEnv;
    if (conflicterEnv.conflicter) {
        conflicterEnv.conflicter.force = force ?? true;
    }

    if (conflicterEnv.conflicterOptions) {
        conflicterEnv.conflicterOptions.force = force ?? true;
    }
}

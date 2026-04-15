import type { Mta, mta } from '@sap/mta-lib';
import type { Logger } from '@sap-ux/logger';

/**
 * Shared mutable state passed to all internal manager classes.
 * Managers read from and write to this context — they never own the data directly.
 */
export interface MtaContext {
    readonly mta: Mta;
    readonly apps: Map<string, mta.Module>;
    readonly modules: Map<string, mta.Module>;
    readonly resources: Map<string, mta.Resource>;
    readonly mtaDir: string;
    readonly log: Logger | undefined;
    /** The MTA ID prefix, set after init(). May be empty string before init completes. */
    mtaId: string;
    dirty: boolean;
}

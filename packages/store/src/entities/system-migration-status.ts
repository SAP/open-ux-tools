import type { EntityKey } from '.';
import { serializable } from '../decorators';

/**
 * This represents the migration status of the systems from pure secure store
 * the hybrid filesystem/secure store
 */
export class SystemMigrationStatus {
    @serializable public readonly migrationDone: boolean;
    @serializable public readonly authTypeMigrated: boolean;
    @serializable public readonly migrationLogs: string[];

    /**
     *
     * @param root0
     * @param root0.authTypeMigrated
     * @param root0.migrationDone
     * @param root0.migrationLogs
     */
    constructor({
        authTypeMigrated,
        migrationDone,
        migrationLogs
    }: {
        authTypeMigrated: boolean;
        migrationDone: boolean;
        migrationLogs: string[];
    }) {
        this.migrationDone = migrationDone;
        this.authTypeMigrated = authTypeMigrated;
        this.migrationLogs = migrationLogs;
    }
}

/**
 *
 */
export class SystemMigrationStatusKey implements EntityKey {
    /**
     *
     */
    public getId(): string {
        return 'systemMigration'; // A singleton
    }
}

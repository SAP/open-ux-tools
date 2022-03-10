## Example Migration Code
```typescript
export async function migrate(
    logger: Logger,
    systemDataProvider: DataProvider<BackendSystem, BackendSystemKey>
): Promise<void> {
    try {
        const systemMigrationStatusDataProvider = new SystemMigrationStatusDataProvider(logger);
        const systemMigrationStatus: SystemMigrationStatus = (await systemMigrationStatusDataProvider.read(
            new SystemMigrationStatusKey()
        )) || { migrationDone: false, authTypeMigrated: false, migrationLogs: [] };
        const migrationLogger = createLogInterceptor(logger, systemMigrationStatus.migrationLogs);

        const secureStore = getSecureStore(migrationLogger);
        const migration = new Migration({
            logger: migrationLogger,
            systemMigrationStatus,
            secureStore,
            systemDataProvider
        });

        const { migrationStatus: updatedStatus, dirty } = await migration.run();
        if (dirty) {
            await systemMigrationStatusDataProvider.write(
                new SystemMigrationStatus({
                    ...updatedStatus,
                    migrationLogs: updatedStatus.migrationLogs.slice(-200) // Limit to 200 entries
                })
            );
        }
    } catch (e) {
        logger.warn(text('error.systemMigrationFailed'));
        logger.debug(errorString(e));
    }
}

function addBeforeHook(hookFn: LogMethod, fn: LogMethod): LogMethod {
    return function (arg: string | object): void {
        hookFn(arg);
        fn(arg);
    };
}

/** Capture all the logs to save in the migration logs */
function createLogInterceptor(logger: Logger, migrationLogs: string[]): Logger {
    const migrationLogger = getMigrationLogger(migrationLogs);
    return {
        info: addBeforeHook(migrationLogger, logger.info),
        warn: addBeforeHook(migrationLogger, logger.warn),
        error: addBeforeHook(migrationLogger, logger.error),
        debug: migrationLogger
    };
}

function getMigrationLogger(migrationLogs: string[]): debug.Debugger {
    const migrationLogger = newDebugLogger(MIGRATION_NAMESPACE);

    migrationLogger.log = (args: unknown[]): void => {
        migrationLogs.push(args?.toString());
    };

    enableDebugLogger(MIGRATION_NAMESPACE);
    return migrationLogger;
}
```

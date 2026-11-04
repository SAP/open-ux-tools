/**
 * Event names for telemetry for the generator when downloading an app from repository
 */
export const EventName = {
    /** Zip file successfully fetched from the ABAP repository during the prompting phase. */
    ABAP_REPO_DOWNLOAD_SUCCESS: 'ABAP_REPO_DOWNLOAD_SUCCESS',
    /** Full ABAP repository app generation completed successfully - fired in end(). */
    ABAP_REPO_DOWNLOAD_COMPLETE: 'ABAP_REPO_DOWNLOAD_COMPLETE',
    /** Writing phase failed for an ABAP repository download (caught exception). */
    ABAP_REPO_APP_WRITING_FAILED: 'ABAP_REPO_APP_WRITING_FAILED',
    /** Server returned no content — legacy ABAP system without repository content. */
    ABAP_REPO_DOWNLOAD_FAIL: 'ABAP_REPO_DOWNLOAD_FAIL',
    /** Zip file successfully fetched during ADT quick-deploy prompting phase. */
    ADT_QUICK_DEPLOY_DOWNLOAD_SUCCESS: 'ADT_QUICK_DEPLOY_DOWNLOAD_SUCCESS',
    /** Full ADT quick-deploy app generation completed successfully (fired in end()). */
    ADT_QUICK_DEPLOY_COMPLETE: 'ADT_QUICK_DEPLOY_COMPLETE',
    /** Writing phase failed for an ADT quick-deploy download (caught exception). */
    ADT_QUICK_DEPLOY_APP_WRITING_FAILED: 'ADT_QUICK_DEPLOY_APP_WRITING_FAILED',
    /** Post-generation migration hook completed for an ABAP repository app. */
    ABAP_REPO_DOWNLOAD_MIGRATION_COMPLETED: 'ABAP_REPO_DOWNLOAD_MIGRATION_COMPLETED'
} as const;

export type EventName = (typeof EventName)[keyof typeof EventName];

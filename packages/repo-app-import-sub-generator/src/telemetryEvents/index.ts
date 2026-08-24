/**
 * Event names for telemetry for the generator when downloading an app from repository
 */
export const EventName = {
    ABAP_REPO_DOWNLOAD_SUCCESS: 'ABAP_REPO_DOWNLOAD_SUCCESS',
    ABAP_REPO_DOWNLOAD_FAIL: 'ABAP_REPO_DOWNLOAD_FAIL',
    ADT_QUICK_DEPLOY_DOWNLOAD_SUCCESS: 'ADT_QUICK_DEPLOY_DOWNLOAD_SUCCESS',
    ADT_QUICK_DEPLOY_DOWNLOAD_FAIL: 'ADT_QUICK_DEPLOY_DOWNLOAD_FAIL',
    ABAP_REPO_DOWNLOAD_MIGRATION_COMPLETED: 'ABAP_REPO_DOWNLOAD_MIGRATION_COMPLETED'
} as const;

export type EventName = (typeof EventName)[keyof typeof EventName];

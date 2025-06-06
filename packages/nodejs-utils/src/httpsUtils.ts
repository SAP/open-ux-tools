import https from 'https';

/**
 * Set the rejectUnauthorized option of the global https agent.
 *
 * @param rejectUnauthorized - true to reject unauthorized certificates, false to accept them
 */
export function setGlobalRejectUnauthorized(rejectUnauthorized: boolean): void {
    if (https.globalAgent.options) {
        https.globalAgent.options.rejectUnauthorized = rejectUnauthorized;
    }
    //@ts-expect-error - fallbackAgent is only present in BoundHttpsProxyAgent implementation and is not part of the Node.js API
    if (https.globalAgent.fallbackAgent?.options) {
        //@ts-expect-error - fallbackAgent is not typed in Node.js API
        https.globalAgent.fallbackAgent.options.rejectUnauthorized = rejectUnauthorized;
    }
}

import { runAsWorker } from 'synckit';
import { getWebappPath } from '@sap-ux/project-access';

/**
 *
 * @param projectRoot
 */
export async function getWebappPathSync(projectRoot: string) {
    return getWebappPath(projectRoot);
}

runAsWorker(getWebappPathSync);

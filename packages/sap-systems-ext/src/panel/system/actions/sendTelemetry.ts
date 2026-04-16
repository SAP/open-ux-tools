import type { PanelContext } from '../../../types/system/index.js';
import { TelemetryHelper } from '../../../utils/index.js';
import { GuidedAnswersLinkAction, SystemAction, SYSTEMS_EVENT } from '../../../utils/constants/index.js';

/**
 * Fires telemetry when the Guided Answers link is clicked.
 *
 * @param context - panel context
 */
export function fireGALinkClickedTelemetry(context: PanelContext): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.GUIDED_ANSWERS,
        status: GuidedAnswersLinkAction.LINK_CLICKED,
        isGuidedAnswersEnabled: context.isGuidedAnswersEnabled ? 'true' : 'false'
    });
}

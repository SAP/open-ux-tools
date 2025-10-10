import type { PanelContext } from '../../../types/system';
import { logTelemetryEvent } from '../../../utils';
import { GuidedAnswersLinkAction, SystemAction, SYSTEMS_EVENT } from '../../../utils/constants';

/**
 * Fires telemetry when the Guided Answers link is clicked.
 *
 * @param context - panel context
 */
export function fireGALinkClickedTelemetry(context: PanelContext): void {
    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.GUIDED_ANSWERS,
        status: GuidedAnswersLinkAction.LINK_CLICKED,
        isGuidedAnswersEnabled: context.isGuidedAnswersEnabled ? 'true' : 'false'
    });
}

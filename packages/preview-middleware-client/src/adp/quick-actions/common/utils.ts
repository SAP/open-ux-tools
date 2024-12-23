import { TextBundle } from '../../../i18n';

export function getTooltipsForTableEmptyRowModeAction(resourceBundle: TextBundle) {
    const alreadyEnabledTooltip = resourceBundle.getText('EMPTY_ROW_MODE_IS_ALREADY_ENABLED');
    const unsupportedCreationRowsTooltip = resourceBundle.getText('EMPTY_ROW_MODE_IS_NOT_SUPPORTED');
    return { alreadyEnabledTooltip, unsupportedCreationRowsTooltip };
}

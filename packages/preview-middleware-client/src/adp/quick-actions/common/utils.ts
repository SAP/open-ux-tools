import { TextBundle } from '../../../i18n';

export function getTooltipsForTableRowCreationAction(resourceBundle: TextBundle) {
    const alreadyEnabledTooltip = resourceBundle.getText('CREATION_ROWS_IS_ALREADY_ENABLED');
    const unsupportedCreationRowsTooltip = resourceBundle.getText('CREATION_ROWS_IS_NOT_SUPPORTED');
    return { alreadyEnabledTooltip, unsupportedCreationRowsTooltip };
}

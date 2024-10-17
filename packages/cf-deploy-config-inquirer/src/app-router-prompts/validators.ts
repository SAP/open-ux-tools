import { existsSync } from 'fs';
import { t } from '../i18n';
import { CfAppRouterDeployConfigAnswers } from '../types';

export function validateMtaPath(input: string): boolean | string {
    return (
        (input?.trim() && existsSync(input.trim())) ||
        t('errors.folderDoesNotExistError')
    );
}


export function validateMtaId(input: string, previousAnswers: CfAppRouterDeployConfigAnswers): boolean | string {
    if (typeof input !== 'string' || !input.trim()) {
        return ErrorMessages.noMtaId;
    } else if (!input.match(/^[a-zA-Z_]+[a-zA-Z0-9_\-.]*$/)) {
        return ErrorMessages.invalidMtaId;
    }

    if (existsSync(join(previousAnswers.inputDestinationRoot, input.trim()))) {
        return ErrorMessages.mtaIdAlreadyExist(previousAnswers.inputDestinationRoot);
    }

    // All checks passed
    return true;
}
import type { SourceApplication } from '@sap-ux/adp-tooling';
import { TargetEnvironment } from '../../types';
import { t } from '../../../utils/i18n';

interface Choice<ValueType> {
    name: string;
    value: ValueType;
}

/**
 * Creates a list of choices from a list of applications, formatted for display or selection in a UI.
 * Each choice consists of an application's title (or ID if no title), followed by its registration IDs and ACH, formatted for easy reading.
 *
 * @param {SourceApplication[]} apps - An array of applications to be transformed into display choices.
 * @returns {Choice[]} An array of objects each containing a value (the full application object) and a name (a formatted string).
 */
export const getApplicationChoices = (apps: SourceApplication[]): Choice<SourceApplication>[] => {
    return Array.isArray(apps)
        ? apps.map((app) => {
              const name = app.title
                  ? `${app.title} (${app.id}, ${app.registrationIds}, ${app.ach})`
                  : `${app.id} (${app.registrationIds}, ${app.ach})`;
              return {
                  value: app,
                  name: name.replace('(, )', '').replace(', , ', ', ').replace(', )', ')').replace('(, ', '(')
              };
          })
        : apps;
};

/**
 * Creates a list of possibl eoptions for target environment.
 *
 * @returns {Choice<TargetEnvironment>[]} The list of target environments.
 */
export const getEnvironmentChoices = (): Choice<TargetEnvironment>[] => {
    return [
        {
            name: t('prompts.targetEnvironmentAbapName'),
            value: TargetEnvironment.abap
        },
        { name: t('prompts.targetEnvironmentCFName'), value: TargetEnvironment.cloudFoundry }
    ];
};

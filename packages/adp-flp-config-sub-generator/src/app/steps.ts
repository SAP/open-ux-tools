import { WizardPageFactory } from '@sap-ux/adp-tooling';

type FlpPageLocalId = 'flpCredentials' | 'flpConfig' | 'tileSettings';

export const flpPageFactory = new WizardPageFactory<FlpPageLocalId>('@sap-ux/adp-flp-config-sub-generator');

import { WizardPageFactory } from '@sap-ux/adp-tooling';

type PageLocalId = 'flpCredentials' | 'flpConfig' | 'tileSettings';

export const wizardPageFactory = new WizardPageFactory<PageLocalId>('@sap-ux/adp-flp-config-sub-generator');

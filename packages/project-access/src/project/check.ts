import { deleteModule, getModule } from './module-loader';
import { refreshSpecificationDistTags } from './specification';

// getModule('@sap/ux-specification', '1.108.31').then(console.log).catch(console.error);
// getModule('@sap/ux-specification', '1.71.110').then(console.log).catch(console.error);
// deleteModule('@sap/ux-specification', '1.71.110').then(console.log).catch(console.error);

refreshSpecificationDistTags().then(console.log).catch(console.error);

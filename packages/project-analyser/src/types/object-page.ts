import type { ObjectPageHeader } from '@sap/ux-specification/dist/types/src/v4/controls/ObjectPageHeader';
import type { ObjectPageLayout } from '@sap/ux-specification/dist/types/src/v4/controls/ObjectPageLayout';
import type {
    GenericSections,
    CustomSections
} from '@sap/ux-specification/dist/types/src/v4/controls/ObjectPageSection';
import type { ObjectPageFooter } from '@sap/ux-specification/dist/types/src/v4/controls/ObjectPageFooter';

export interface ObjectPageAnalysis {
    readonly header?: ObjectPageHeader;
    readonly layout?: ObjectPageLayout;
    readonly sections?: GenericSections | CustomSections;
    readonly footer?: ObjectPageFooter;
}

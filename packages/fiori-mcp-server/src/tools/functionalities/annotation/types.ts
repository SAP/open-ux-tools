
export interface FioriFeature {
  id: string;
  name: string;
  description: string;
  // searchTerms: string[];
  category: 'list-report' | 'object-page' | 'general' | 'navigation' | 'forms' | 'tables' | 'charts' | 'actions';
  subCategory?: string;
  area: 'header' | 'content',
  implementation: {
    annotations: string[];
    manifestSettings?: string[];
    cdsExample?: string;
    manifestExample?: string;
    notes?: string[];
  };
  relatedFeatures?: string[];
  ui5Version?: string;
}

export interface FioriFeature {
  id: string;
  name: string;
  description: string;
  category: ['list-report' | 'object-page'];
  area: 'header' | 'content',
  implementation: {
    annotations: string[];
    cdsExample?: string;
  };
  ui5Version?: string;
}
import type { FunctionalityHandlers, GetFunctionalityDetailsOutput } from '../../types';
import { ADD_PAGE_FUNCTIONALITY, addPageHandlers, DELETE_PAGE_FUNCTIONALITY, deletePageHandlers } from './page';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY, createControllerExtensionHandlers } from './controller-extension';
import { GENERATE_FIORI_UI_APP, generateFioriUIAppHandlers } from './generate-fiori-ui-app';
export const FUNCTIONALITIES_DETAILS = [
    ADD_PAGE_FUNCTIONALITY,
    GENERATE_FIORI_UI_APP,
    DELETE_PAGE_FUNCTIONALITY,
    CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY
];

export const FUNCTIONALITIES_HANDLERS: Map<string, FunctionalityHandlers> = new Map([
    [ADD_PAGE_FUNCTIONALITY.id, addPageHandlers],
    [DELETE_PAGE_FUNCTIONALITY.id, deletePageHandlers],
    [GENERATE_FIORI_UI_APP.id, generateFioriUIAppHandlers],
    [CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY.id, createControllerExtensionHandlers]
]);

// NOTE!!!: Mocked/demo/example functionality
// Detailed functionality information
const FUNCTIONALITY_DETAILS: { [key: string]: GetFunctionalityDetailsOutput } = {
    'add-table-column': {
        id: 'add-table-column',
        name: 'Add Column to List Report Table',
        description: 'Adds a new column to the main table in a List Report application',
        technicalDescription:
            'This functionality modifies the manifest.json and adds the specified property to the table columns configuration. It updates the UI5 table binding and ensures proper data binding.',
        parameters: [
            {
                id: 'columnName',
                name: 'Column Name',
                type: 'string',
                required: true,
                description: 'The name/label of the new column'
            },
            {
                id: 'propertyPath',
                name: 'Property Path',
                type: 'string',
                required: true,
                description: 'The OData property path for the column data'
            },
            {
                id: 'position',
                name: 'position',
                type: 'number',
                required: false,
                description: 'Position index where to insert the column (0-based)',
                defaultValue: -1
            },
            {
                id: 'width',
                name: 'width',
                type: 'string',
                required: false,
                description: 'Column width (e.g., "10rem", "auto")',
                defaultValue: 'auto'
            },
            {
                id: 'sortable',
                name: 'sortable',
                type: 'boolean',
                required: false,
                description: 'Whether the column should be sortable',
                defaultValue: true
            }
        ],
        prerequisites: [
            'Application must be a List Report or Analytical List Page',
            'OData service must contain the specified property'
        ],
        impact: 'Modifies manifest.json, may require regeneration of UI if using SAP Fiori tools',
        examples: [
            'Add a "Status" column: columnName="Status", propertyPath="StatusCode"',
            'Add a "Created Date" column at position 2: columnName="Created", propertyPath="CreatedAt", position=2'
        ]
    },
    'switch-flexible-layout': {
        id: 'switch-flexible-layout',
        name: 'Switch to Flexible Column Layout',
        description: 'Converts the application to use SAP Fiori Flexible Column Layout',
        technicalDescription:
            'Updates the application to use sap.f.FlexibleColumnLayout instead of standard layout. Modifies routing configuration and view structure to support multi-column navigation.',
        parameters: [
            {
                id: 'defaultLayout',
                name: 'Default Layout',
                type: 'string',
                required: false,
                description: 'Default layout configuration',
                options: ['OneColumn', 'TwoColumnsBeginExpanded', 'TwoColumnsMidExpanded', 'ThreeColumnsMidExpanded'],
                defaultValue: 'TwoColumnsBeginExpanded'
            },
            {
                id: 'enableFullScreen',
                name: 'Enable Full Screen',
                type: 'boolean',
                required: false,
                description: 'Enable full screen mode for detail pages',
                defaultValue: true
            }
        ],
        prerequisites: ['Application must support navigation to detail pages', 'UI5 version 1.46 or higher'],
        impact: 'Major structural changes to application, affects routing and navigation',
        examples: [
            'Enable FCL with default settings: defaultLayout="TwoColumnsBeginExpanded"',
            'Enable FCL with three columns: defaultLayout="ThreeColumnsMidExpanded"'
        ]
    },
    'add-filter-field': {
        id: 'add-filter-field',
        name: 'Add Filter Field to List Page',
        description: 'Adds a new filter field to the filter bar on the list page',
        technicalDescription:
            'Extends the SmartFilterBar configuration in the manifest.json to include a new filter field. Updates the filter bar binding and ensures proper OData integration.',
        parameters: [
            {
                id: 'fieldName',
                name: 'Field Name',
                type: 'string',
                required: true,
                description: 'The name/label of the filter field'
            },
            {
                id: 'propertyPath',
                name: 'Property Path',
                type: 'string',
                required: true,
                description: 'The OData property path for filtering'
            },
            {
                id: 'controlType',
                name: 'Control Type',
                type: 'string',
                required: false,
                description: 'Type of filter control',
                options: ['Input', 'ComboBox', 'MultiComboBox', 'DatePicker', 'DateRangeSelection'],
                defaultValue: 'Input'
            },
            {
                id: 'mandatory',
                name: 'mandatory',
                type: 'boolean',
                required: false,
                description: 'Whether the filter field is mandatory',
                defaultValue: false
            }
        ],
        prerequisites: [
            'Application must have a SmartFilterBar',
            'OData service must support filtering on the specified property'
        ],
        impact: 'Modifies manifest.json filter configuration',
        examples: [
            'Add status filter: fieldName="Status", propertyPath="StatusCode", controlType="ComboBox"',
            'Add date range filter: fieldName="Created Date", propertyPath="CreatedAt", controlType="DateRangeSelection"'
        ]
    },
    'enable-draft-mode': {
        id: 'enable-draft-mode',
        name: 'Enable Draft Mode',
        description: 'Enables draft functionality for create/edit operations',
        technicalDescription:
            'Configures the application to use OData V4 draft capabilities. Updates manifest.json to enable draft handling and modifies object page configuration for draft operations.',
        parameters: [
            {
                id: 'autosaveInterval',
                name: 'Autosave Interval',
                type: 'number',
                required: false,
                description: 'Auto-save interval in seconds (0 to disable)',
                defaultValue: 30
            },
            {
                id: 'showDraftIndicator',
                name: 'Show Draft Indicator',
                type: 'boolean',
                required: false,
                description: 'Show draft indicator in the UI',
                defaultValue: true
            }
        ],
        prerequisites: [
            'OData service must support draft capabilities',
            'Application must have object pages for editing'
        ],
        impact: 'Enables draft handling, affects save/cancel behavior',
        examples: [
            'Enable draft with 30s autosave: autosaveInterval=30',
            'Enable draft without autosave: autosaveInterval=0'
        ]
    },
    'add-custom-action': {
        id: 'add-custom-action',
        name: 'Add Custom Action Button',
        description: 'Adds a custom action button to the table toolbar',
        technicalDescription:
            'Extends the table toolbar configuration to include a custom action button. Creates the necessary controller extension and action handler.',
        parameters: [
            {
                id: 'actionName',
                name: 'Action Name',
                type: 'string',
                required: true,
                description: 'Name/label of the action button'
            },
            {
                id: 'actionId',
                name: 'Action Id',
                type: 'string',
                required: true,
                description: 'Unique identifier for the action'
            },
            {
                id: 'icon',
                name: 'icon',
                type: 'string',
                required: false,
                description: 'SAP icon name (without sap-icon://)',
                defaultValue: 'action'
            },
            {
                id: 'requiresSelection',
                name: 'Requires Selection',
                type: 'boolean',
                required: false,
                description: 'Whether the action requires table row selection',
                defaultValue: true
            }
        ],
        prerequisites: ['Application must have a table with toolbar', 'Controller extension capability'],
        impact: 'Adds new button to table toolbar, creates controller extension',
        examples: [
            'Add approve action: actionName="Approve", actionId="approve", icon="accept"',
            'Add export action: actionName="Export", actionId="export", icon="download", requiresSelection=false'
        ]
    },
    'configure-variant-management': {
        id: 'configure-variant-management',
        name: 'Configure Variant Management',
        description: 'Enables and configures variant management for the application',
        technicalDescription:
            'Enables SmartVariantManagement for the application, allowing users to save and manage different view configurations including filters, sorting, and column settings.',
        parameters: [
            {
                id: 'showShare',
                name: 'Show Share',
                type: 'boolean',
                required: false,
                description: 'Allow users to share variants',
                defaultValue: true
            },
            {
                id: 'showExecuteOnSelection',
                name: 'Show Execute On Selection',
                type: 'boolean',
                required: false,
                description: 'Show execute on selection option',
                defaultValue: false
            }
        ],
        prerequisites: ['Application must use SmartTable and SmartFilterBar'],
        impact: 'Enables variant management capabilities',
        examples: [
            'Enable basic variant management: showShare=true',
            'Enable with execute on selection: showExecuteOnSelection=true'
        ]
    },
    'add-chart-view': {
        id: 'add-chart-view',
        name: 'Add Chart View',
        description: 'Adds a chart view alongside the table view',
        technicalDescription:
            'Implements a chart view using SmartChart control alongside the existing table. Adds view switching capabilities and configures chart binding.',
        parameters: [
            {
                id: 'chartType',
                name: 'Chart Type',
                type: 'string',
                required: false,
                description: 'Type of chart to display',
                options: ['column', 'bar', 'line', 'pie', 'donut'],
                defaultValue: 'column'
            },
            {
                id: 'dimensionField',
                name: 'Dimension Field',
                type: 'string',
                required: true,
                description: 'Field to use as chart dimension'
            },
            {
                id: 'measureField',
                name: 'Measure Field',
                type: 'string',
                required: true,
                description: 'Field to use as chart measure'
            }
        ],
        prerequisites: ['Application must have aggregatable data', 'OData service must support analytics'],
        impact: 'Adds chart view and view switching controls',
        examples: [
            'Add status chart: chartType="pie", dimensionField="Status", measureField="Count"',
            'Add sales chart: chartType="column", dimensionField="Month", measureField="Revenue"'
        ]
    },
    'enable-export-functionality': {
        id: 'enable-export-functionality',
        name: 'Enable Export Functionality',
        description: 'Adds export to Excel/PDF functionality to the table',
        technicalDescription:
            'Configures the SmartTable to enable export capabilities. Adds export buttons to the table toolbar and configures export settings.',
        parameters: [
            {
                id: 'enableExcelExport',
                name: 'Enable Excel Export',
                type: 'boolean',
                required: false,
                description: 'Enable Excel export',
                defaultValue: true
            },
            {
                id: 'enablePdfExport',
                name: 'Enable Pdf Export',
                type: 'boolean',
                required: false,
                description: 'Enable PDF export',
                defaultValue: false
            },
            {
                id: 'fileName',
                name: 'File Name',
                type: 'string',
                required: false,
                description: 'Default export file name',
                defaultValue: 'export'
            }
        ],
        prerequisites: ['Application must use SmartTable'],
        impact: 'Adds export buttons to table toolbar',
        examples: [
            'Enable Excel export: enableExcelExport=true, fileName="data_export"',
            'Enable both exports: enableExcelExport=true, enablePdfExport=true'
        ]
    }
};

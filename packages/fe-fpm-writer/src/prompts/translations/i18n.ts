// converted to ts file to support i18next "returnObjects" option
// see https://www.i18next.com/misc/migration-guide#more-information-features-and-breaking-changes
// t function will now infer interpolation values, but it'll only work if the translation files (resources)
// are placed in a ts file and using as const (like this) or an interface in a d.ts file (can be generated like this),
// JSON files don't support as const to convert objects to be type literals (yet).
const ns1 = {
    'prompts': {
        'super': {
            'buildingBlockType': {
                'message': 'Select a building block',
                'choices': {
                    'chart': 'Chart',
                    'filterBar': 'Filter Bar',
                    'table': 'Table'
                }
            },
            'manifestGroup': {
                'manifestLibrariesTitle': 'Manifest Libraries',
                'manifestLibrariesDescription': [
                    'In order for macros to work, we need to ensure that the sap.fe.macros library is maintained in manifest.json. Please see the code snippet.'
                ]
            }
        },
        'common': {
            'id': {
                'existingIdValidation': 'An element with this ID already exists',
                'defaultPlaceholder': 'Enter a building block ID'
            },
            'service': {
                'defaultPlaceholder': 'Select a service'
            },
            'entity': {
                'defaultPlaceholder': 'Select an entity'
            },
            'aggregationPath': {
                'defaultPlaceholder': 'Select an aggregation path'
            },
            'filterBar': {
                'defaultPlaceholder': 'Enter a new filter bar ID'
            },
            'viewOrFragmentPath': {
                'defaultPlaceholder': 'Select a view or fragment file'
            },
            'bindingContextType': {
                'option': {
                    'relative': 'Relative',
                    'absolute': 'Absolute'
                }
            },
            'validation': {
                'errorMessage': {
                    'input': 'Please enter a value',
                    'select': 'Please select a value'
                }
            },
            'targetProperty': {
                'defaultPlaceholder': 'Select a target property'
            }
        },
        'chart': {
            'chartBuildingBlockPropertiesTitle': 'Chart Building Block Properties',
            'chartBuildingBlockPropertiesDescription': [
                'Select the `View or Fragment File` where you would like to insert the chart building block and provide a `Building Block ID` to identify the chart.',
                'Select an `Entity Set`, and a `Chart Annotation` you would like to use for the chart building block.',
                'Select an `Aggregation Path` to determine where you would like the chart to be placed on the page.'
            ],
            'chartVisualizationPropertiesTitle': 'Chart Visualization Properties',
            'chartVisualizationPropertiesDescription': ['Configure your chart using the properties below.'],
            'chartConfigureEventsTitle': 'Configure Events',
            'chartConfigureEventsDescription': [
                'Configure the below properties to react to events. Event handler methods are invoked when an event occurs.'
            ],
            'id': {
                'message': 'Building Block ID',
                'validation': 'An ID is required to generate the chart building block'
            },
            'aggregation': 'Aggregation Path',
            'entity': 'Entity',
            'service': 'Service',
            'viewOrFragmentPath': {
                'message': 'View or Fragment File',
                'validation': 'A View or Fragment is required to generate the chart building block'
            },
            'contextPath': 'Enter the context path used in the page',
            'metaPath': 'Enter the relative path of the property in the meta model',
            'filterBar': {
                'message': 'Associated Filter Bar ID',
                'validation': 'Enter the ID of the filter bar building block associated with the chart',
                'placeholder': 'Select or enter a filter bar ID',
                'inputPlaceholder': 'Enter a new filter bar ID'
            },
            'bindingContextType': 'Binding Context Path Type',
            'personalization': {
                'message': 'Chart Personalization',
                'choices': {
                    'type': 'Type',
                    'item': 'Item',
                    'sort': 'Sort'
                },
                'placeholder': 'Select chart personalization'
            },
            'selectionMode': {
                'message': 'Selection Mode',
                'choices': {
                    'single': 'Single',
                    'multiple': 'Multiple'
                }
            },
            'selectionChange': 'Selection Change Event',
            'selectionChangePlaceholder': 'Enter a function to be executed',
            'qualifier': 'Chart Annotation Path',
            'qualifierPlaceholder': 'Select a chart annotation path',
            'valuesDependentOnEntityTypeInfo': 'Values are dependent on entity set'
        },
        'filterBar': {
            'filterBarBuildingBlockPropertiesTitle': 'Filter Bar Building Block Properties',
            'filterBarBuildingBlockPropertiesDescription': [
                'Select the `View or Fragment File` where you would like to insert the filter bar building block and provide a `Building Block ID` to identify the filter bar.',
                'Select an `Entity Set`, and a `Selection Field Annotation` you would like to use for the filter bar building block.',
                'Select an `Aggregation Path` to determine where you would like the filter bar to be placed on the page.'
            ],
            'filterBarConfigureEventsTitle': 'Configure Events',
            'filterBarConfigureEventsDescription': [
                'Configure the below properties to react to events. Event handler methods are invoked when an event occurs.'
            ],
            'id': {
                'message': 'Building Block ID',
                'validation': 'An ID is required to generate the filter bar building block'
            },
            'viewOrFragmentPath': {
                'message': 'View or Fragment File',
                'validation': 'A View or Fragment is required to generate the filterbar building block'
            },
            'entity': 'Entity',
            'service': 'Service',
            'metaPath': 'Enter the relative path of the property in the meta model',
            'filterChanged': 'Filter Changed Event',
            'filterChangedPlaceholder': 'Enter a function to be executed',
            'search': 'Search Event',
            'searchPlaceholder': 'Enter a function to be executed',
            'qualifier': 'Selection Field Annotation Path',
            'qualifierPlaceholder': 'Select a selection field annotation path',
            'aggregation': 'Aggregation Path',
            'valuesDependentOnEntityTypeInfo': 'Values are dependent on entity set',
            'bindingContextType': 'Binding Context Path Type'
        },
        'table': {
            'tableBuildingBlockPropertiesTitle': 'Table Building Block Properties',
            'tableBuildingBlockPropertiesDescription': [
                'Select the `View or Fragment File` where you would like to insert the table building block and provide a `Building Block ID` to identify the table.',
                'Select an `Entity Set`, and a `Line Item Annotation` you would like to use for the table building block.',
                'Select an `Aggregation Path` to determine where you would like the table to appear on the page.',
                'Provide the Associated Filter Bar ID if you want to link the table to an existing filter bar.'
            ],
            'tableVisualizationPropertiesTitle': 'Table Visualization Properties',
            'tableVisualizationPropertiesDescription': ['Configure your table using the properties below.'],
            'viewOrFragmentPath': {
                'message': 'View or Fragment File',
                'validation': 'A View or Fragment is required to generate the table building block'
            },
            'id': {
                'message': 'Building Block ID',
                'validation': 'An ID is required to generate the table building block'
            },
            'bindingContextType': 'Binding Context Path Type',
            'entity': 'Entity',
            'service': 'Service',
            'qualifier': 'Line Item Annotation Path',
            'qualifierPlaceholder': 'Select a line item annotation path',
            'aggregation': 'Aggregation Path',
            'filterBar': {
                'message': 'Associated Filter Bar ID',
                'validation': 'Enter the ID of the filter bar building block associated with the table',
                'placeholder': 'Select or enter a filter bar ID',
                'inputPlaceholder': 'Enter a new filter bar ID'
            },
            'tableType': {
                'message': 'Table Type'
            },
            'selectionMode': {
                'message': 'Select a Selection Mode',
                'choices': {
                    'multiple': 'Multiple',
                    'single': 'Single',
                    'auto': 'Auto',
                    'none': 'None'
                }
            },
            'headerVisible': 'Display Header',
            'header': {
                'message': 'Table Header Text',
                'validation': 'Enter a Table Header Text',
                'translationAnnotation': 'Header of the table'
            },
            'personalization': {
                'message': 'Table Personalization',
                'choices': {
                    'Sort': 'Sort',
                    'Column': 'Column',
                    'Filter': 'Filter'
                }
            },
            'tableVariantManagement': 'Select a Table Variant Management',
            'readOnlyMode': 'Enable Read Only Mode',
            'autoColumnWidth': 'Enable Auto Column Width',
            'dataExport': 'Enable Data Export',
            'fullScreenMode': 'Enable Full Screen Mode',
            'pasteFromClipboard': 'Enable Paste From Clipboard',
            'tableSearchableToggle': 'Table Searchable Toggle',
            'valuesDependentOnEntityTypeInfo': 'Values are dependent on entity set'
        },
        'richTextEditor': {
            'id': {
                'message': 'Building Block ID',
                'validation': 'An ID is required to generate the Rich Text Editor building block.'
            },
            'viewOrFragmentPath': {
                'message': 'View or Fragment File',
                'validation': 'A view or fragment is required to generate the Rich Text Editor building block.'
            },
            'bindingContextType': 'Binding Context',
            'relativeBindingDisabledTooltip': 'There are no suitable entities available for relative binding.',
            'valueSource': 'Value Source',
            'entitySet': 'Entity',
            'targetProperty': 'Target Property',
            'aggregation': 'Aggregation Path',
            'buttonGroup': {
                'name': 'Button Group Name',
                'buttons': 'Buttons',
                'visible': 'Visible',
                'priority': 'Priority',
                'customToolbarPriority': 'Custom Toolbar Priority',
                'row': 'Row'
            }
        },
        'page': {
            'id': {
                'message': 'Building Block ID',
                'validation': 'An ID is required to generate the page building block.'
            },
            'viewOrFragmentPath': {
                'message': 'View or Fragment File',
                'validation': 'A View or Fragment is required to generate the page building block.'
            },
            'aggregation': 'Aggregation Path',
            'title': {
                'message': 'Page Title',
                'validation': 'Enter a Page Title',
                'translationAnnotation': 'Title of the Page.'
            },
            'description': {
                'message': 'Page Description',
                'validation': 'Enter a Page Description',
                'translationAnnotation': 'Description of the Page.'
            }
        }
    },
    'pageBuildingBlock': {
        'minUi5VersionRequirement':
            'The Page building block feature requires SAPUI5 1.136.0 or higher. The current version is {{ minUI5Version }}, so the Page building block will not be added.'
    },
    'richTextEditorBuildingBlock': {
        'minUi5VersionRequirement':
            'The Rich Text Editor building block feature requires SAPUI5 1.117.0 or higher. The current version is {{ minUI5Version }}, so the Rich Text Editor building block will not be added.'
    }
};
export default ns1;

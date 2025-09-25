import type { ChangeDefinition } from 'sap/ui/fl/Change';
import { TextBundle } from '../../i18n';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../utils/version';
import FlexChange from 'sap/ui/fl/Change';
import JsControlTreeModifier from 'sap/ui/core/util/reflection/JsControlTreeModifier';
import Log from 'sap/base/Log';
import { getError } from '../../utils/error';
import { AppComponent } from 'sap/ui/rta/RuntimeAuthoring';
import { getConfigMapControlIdMap } from '../../utils/fe-v4';
import { PropertyValue } from '@sap-ux-private/control-property-editor-common';

export const ADD_NEW_ANNOTATION_FILE_CHANGE = 'appdescr_app_addAnnotationsToOData';
export const RENAME_CHANGE = 'rename';
export const MOVE_CHANGE = 'moveControls';
export const ADD_XML_CHANGE = 'addXML';
export const PROPERTY_CHANGE = 'propertyChange';
export const PROPERTY_BINDING_CHANGE = 'propertyBindingChange';
export const MANIFEST_V4_CHANGE = 'appdescr_fe_changePageConfiguration';
export const MANIFEST_V2_CHANGE = 'appdescr_ui_generic_app_changePageConfiguration';

type Properties<T extends object> = { [K in keyof T]-?: K extends string ? K : never }[keyof T];

interface BaseChange extends ChangeDefinition {
    creation: string;
}

interface ChangeContent {
    property: string;
    newValue: string;
    newBinding: string;
}

export interface AddXml extends BaseChange {
    changeType: typeof ADD_XML_CHANGE;
    content: {
        targetAggregation: string;
        fragmentPath: string;
    };
}
export interface RenameChange extends BaseChange {
    changeType: typeof RENAME_CHANGE;
    texts: {
        newText: {
            value: string;
            type: string;
        };
    };
}
export interface V2ConfigChange extends BaseChange {
    changeType: typeof MANIFEST_V2_CHANGE;
    propertyName: string;
    content: {
        entityPropertyChange: {
            propertyPath: string;
            propertyValue: Record<string, string>;
        };
        parentPage: {
            component: string;
            entitySet: string;
        };
    };
}

interface ConfigurationChangeContent {
    page: string;
    entityPropertyChange: {
        propertyPath: string;
        operation: 'UPSERT' | 'DELETE' | 'INSERT' | 'UPDATE';
        propertyValue: string | Record<string, string>;
    };
}

export interface ConfigChange extends BaseChange {
    changeType: typeof MANIFEST_V4_CHANGE;
    propertyName: string;
    content: ConfigurationChangeContent;
}

export interface NewAnnotationFileChange extends BaseChange {
    changeType: typeof ADD_NEW_ANNOTATION_FILE_CHANGE;
    content: {
        dataSourceId: string;
        dataSource: {
            [key: string]: {
                uri: string;
            };
        };
    };
}

export interface MoveControlsChange extends BaseChange {
    changeType: typeof MOVE_CHANGE;
    content: {
        movedElements: {
            selector: {
                id: string;
            };
            sourceIndex: string;
            targetIndex: string;
        }[];
        target: {
            selector: {
                id: string;
            };
        };
    };
}

export interface PropertyChange extends BaseChange {
    changeType: typeof PROPERTY_CHANGE | typeof PROPERTY_BINDING_CHANGE;
    controlId: string;
    controlName: string;
    propertyName: string;
    content: ChangeContent;
}

interface ChangeHandlerOptions {
    appComponent: AppComponent;
    textBundle: TextBundle;
    configPropertyControlIdMap?: Map<string, string[]>;
}

export type GenericChange =
    | NewAnnotationFileChange
    | RenameChange
    | MoveControlsChange
    | AddXml
    | PropertyChange
    | ConfigChange
    | V2ConfigChange;

export type ChangeType = GenericChange['changeType'];

/**
 * Returns a shortened version of the given configuration path segments by removing excess segments,
 * leaving only the most relevant parts for display. For example, the configuration path
 * `controlConfiguration/com.sap.UI.v1.LineItem/tableSettings` will be shortened to
 * `LineItem/tableSettings`.
 *
 * @param propertyPathSeg string[]
 * @returns string
 */
function getCompactV4ConfigPath(propertyPathSeg: string[]): string {
    return propertyPathSeg.join('/').replace(/^controlConfiguration\/(?:([^/]+\/))?@[^/]+\.v1\./, '$1');
}

export function assertProperties<T extends object>(properties: Properties<T>[], target: T): void {
    for (const property of properties) {
        const value = target[property];
        if (value === null || value === undefined) {
            throw new Error(`Invalid change, missing ${property} in the change file`);
        }
    }
}
/**
 * Assert change for its validity. Throws error if no value found in saved changes.
 *
 * @param change Change object
 */
export function assertChange(change: PropertyChange): void {
    assertProperties(['fileName', 'selector', 'content'], change);
    assertProperties(['id'], change.selector);
    assertProperties(['property'], change.content);
}

function assertManifestChange(change: ConfigChange): void {
    assertProperties(['fileName', 'content'], change);
    assertProperties(['page', 'entityPropertyChange'], change.content);
    assertProperties(['propertyPath', 'operation', 'propertyValue'], change.content.entityPropertyChange);
}

/**
 * Get FlexObject from change object based on UI5 version.
 *
 * @param change change object
 * @returns FlexChange
 */
export async function getFlexObject(change: object): Promise<FlexChange<ChangeContent>> {
    if (isLowerThanMinimalUi5Version(await getUi5Version(), { major: 1, minor: 109 })) {
        const Change = (await import('sap/ui/fl/Change')).default;
        return new Change(change);
    }

    const FlexObjectFactory = (await import('sap/ui/fl/apply/_internal/flexObjects/FlexObjectFactory')).default;
    return FlexObjectFactory.createFromFileContent(change) as FlexChange<ChangeContent>;
}

/**
 * Get element id by change.
 *
 * @param change to be executed for creating change
 * @param appComponent app component
 * @returns element id or empty string
 */
export async function getControlIdByChange(
    change: FlexChange<ChangeContent>,
    appComponent: AppComponent
): Promise<string | undefined> {
    const selector = typeof change.getSelector === 'function' ? change.getSelector() : undefined;
    const changeType = change.getChangeType();
    const layer = change.getLayer();

    if (!selector?.id) {
        return;
    }

    try {
        let control = JsControlTreeModifier.bySelector(selector, appComponent);
        if (!control) {
            return selector.id;
        }

        const changeHandlerAPI = (await import('sap/ui/fl/write/api/ChangesWriteAPI')).default;

        if (typeof changeHandlerAPI?.getChangeHandler !== 'function') {
            return selector.id;
        }

        const changeHandler = await changeHandlerAPI.getChangeHandler({
            changeType,
            element: control,
            modifier: JsControlTreeModifier,
            layer
        });

        if (changeHandler && typeof changeHandler.getChangeVisualizationInfo === 'function') {
            const result: { affectedControls?: [string] } = await changeHandler.getChangeVisualizationInfo(
                change,
                appComponent
            );
            return JsControlTreeModifier.getControlIdBySelector(
                result?.affectedControls?.[0] ?? selector,
                appComponent
            );
        }

        return JsControlTreeModifier.getControlIdBySelector(selector, appComponent);
    } catch (error) {
        Log.error('Getting element ID from change has failed:', getError(error));
        return selector.id;
    }
}

interface GenericChangeHandlerReturnType {
    changeTitle: string;
    controlId?: string | string[];
    changeType?: string;
    subtitle?: string;
    properties: { label: string; value?: PropertyValue; displayValueWithIcon?: boolean }[];
}
export type ChangeHandler<Change> = (
    change: Change,
    options: ChangeHandlerOptions
) => Promise<GenericChangeHandlerReturnType> | GenericChangeHandlerReturnType;
type GenericChangeHandler = {
    [Change in GenericChange as Change['changeType']]: ChangeHandler<Change>;
};

async function getPropertyChange(
    change: PropertyChange,
    { appComponent }: ChangeHandlerOptions
): Promise<GenericChangeHandlerReturnType> {
    const propertyChange = change;
    const flexObject = await getFlexObject(change);
    const selectorId = await getControlIdByChange(flexObject, appComponent);
    const changeTitle = change.selector.type ? (change.selector.type.split('.').pop() as string) : '';
    assertChange(propertyChange);
    if (
        [propertyChange.content.newValue, propertyChange.content.newBinding].every(
            (item) => item === undefined || item === null
        )
    ) {
        throw new Error('Invalid change, missing new value in the change file');
    }
    if (change.changeType !== PROPERTY_CHANGE && change.changeType !== PROPERTY_BINDING_CHANGE) {
        throw new Error('Unknown Change Type');
    }
    return {
        changeTitle: changeTitle,
        controlId: selectorId,
        changeType: 'property',
        properties: [
            {
                label: propertyChange.content.property,
                value: propertyChange.content.newValue ?? propertyChange.content.newBinding,
                displayValueWithIcon: true
            }
        ]
    };
}

function getV2ConfigurationChange(
    change: V2ConfigChange,
    { textBundle }: ChangeHandlerOptions
): GenericChangeHandlerReturnType {
    const { entityPropertyChange, parentPage } = change.content;
    const propertyPathSegments = entityPropertyChange.propertyPath.split('/');
    const propertyName =
        Object.keys(entityPropertyChange.propertyValue)?.[0] ?? propertyPathSegments[propertyPathSegments.length - 1];
    const propertyValue = entityPropertyChange.propertyValue?.[propertyName] ?? entityPropertyChange.propertyValue;

    return {
        changeTitle: textBundle?.getText('CONFIGURATION_CHANGE'),
        controlId: [],
        changeType: 'configuration',
        subtitle: entityPropertyChange.propertyPath ?? parentPage.component,
        properties: [
            {
                label: propertyName ?? '',
                value: propertyValue,
                displayValueWithIcon: true
            }
        ]
    };
}

function getV4ConfigurationChange(
    change: ConfigChange,
    { configPropertyControlIdMap, textBundle }: ChangeHandlerOptions
): GenericChangeHandlerReturnType {
    assertManifestChange(change);
    if ([change.content.entityPropertyChange.propertyValue].every((item) => item === undefined || item === null)) {
        throw new Error('Invalid change, missing property value on change file');
    }
    const propertyPathSegments = change.content.entityPropertyChange.propertyPath.split('/');
    const propertyName = propertyPathSegments.pop();
    if (!propertyName) {
        throw new Error('No property name found');
    }
    const configMapKey = getConfigMapControlIdMap(change.content.page, propertyPathSegments);
    const controlIds = configPropertyControlIdMap?.get(configMapKey) || [];
    let value = change.content.entityPropertyChange.propertyValue;
    const properties =
        typeof value === 'object'
            ? [
                  {
                      label: propertyName,
                      displayValueWithIcon: true
                  },
                  ...Object.keys(value)
                      .map((key: string) => {
                          if (typeof value[key] === 'object') {
                              return undefined;
                          }
                          return {
                              label: key,
                              value: value[key],
                              displayValueWithIcon: true
                          };
                      })
                      .filter((item) => !!item)
              ]
            : [
                  {
                      label: propertyName,
                      value,
                      displayValueWithIcon: true
                  }
              ];
    return {
        changeTitle: textBundle?.getText('CONFIGURATION_CHANGE'),
        controlId: controlIds,
        changeType: 'configuration',
        subtitle: getCompactV4ConfigPath(propertyPathSegments),
        properties
    };
}

export const GENERIC_CHANGE_HANDLER: GenericChangeHandler = {
    [ADD_NEW_ANNOTATION_FILE_CHANGE]: (annotationFileChange, { textBundle }) => {
        const dataSourceId = annotationFileChange.content.dataSourceId;
        const sourceKey = Object.keys(annotationFileChange.content.dataSource)[0];
        return {
            changeTitle: textBundle?.getText('ADD_NEW_ANNOTATION_FILE'),
            changeType: 'configuration',
            properties: [
                {
                    label: textBundle?.getText('SERVICE_NAME'),
                    value: dataSourceId
                },
                {
                    label: textBundle?.getText('ANNOTATION_FILE_URI'),
                    value: annotationFileChange.content.dataSource[sourceKey].uri
                }
            ]
        };
    },
    [RENAME_CHANGE]: (renameChange, { textBundle }) => {
        const selectorId = renameChange.selector.id;
        return {
            changeTitle: textBundle?.getText('RENAME_CHANGE'),
            controlId: selectorId,
            properties: [
                {
                    label: textBundle?.getText('SELECTOR_ID'),
                    value: selectorId
                },
                {
                    label: textBundle?.getText('NEW_VALUE'),
                    value: renameChange.texts.newText.value
                },
                {
                    label: textBundle?.getText('TEXT_TYPE'),
                    value: renameChange.texts.newText.type
                }
            ]
        };
    },
    [MOVE_CHANGE]: (moveChange, { textBundle }) => {
        const movedControlId = moveChange.content.movedElements[0].selector.id;
        return {
            changeTitle: textBundle?.getText('MOVE_CONTROLS_CHANGE'),
            controlId: movedControlId,
            properties: [
                {
                    label: textBundle?.getText('TARGET_CONTROL_ID'),
                    value: moveChange.content.target.selector.id
                },
                {
                    label: textBundle?.getText('MOVE_FROM_INDEX'),
                    value: String(moveChange.content.movedElements[0].sourceIndex)
                },
                {
                    label: textBundle?.getText('MOVE_TO_INDEX'),
                    value: String(moveChange.content.movedElements[0].targetIndex)
                },
                {
                    label: textBundle?.getText('MOVED_CONTROL_ID'),
                    value: movedControlId
                }
            ]
        };
    },
    [ADD_XML_CHANGE]: (addXmlChange, { textBundle }) => {
        return {
            changeTitle: textBundle?.getText('ADD_XML_CHANGE'),
            controlId: addXmlChange.selector.id,
            properties: [
                {
                    label: textBundle?.getText('AGGREGATION'),
                    value: addXmlChange.content.targetAggregation
                },
                {
                    label: textBundle?.getText('FRAGMENT_PATH'),
                    value: addXmlChange.content.fragmentPath
                }
            ]
        };
    },
    [PROPERTY_CHANGE]: async (change, handlerOptions) => {
        return getPropertyChange(change, handlerOptions);
    },
    [PROPERTY_BINDING_CHANGE]: async (change, handlerOptions) => {
        return getPropertyChange(change, handlerOptions);
    },
    [MANIFEST_V4_CHANGE]: (change, handlerOptions) => {
        return getV4ConfigurationChange(change, handlerOptions);
    },
    [MANIFEST_V2_CHANGE]: (change, handlerOptions) => {
        return getV2ConfigurationChange(change, handlerOptions);
    }
};

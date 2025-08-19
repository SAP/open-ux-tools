import type {
    PageData,
    CreationFormOptions,
    AggregationCreationForm,
    PendingChange,
    SupportedAggregationActions,
    ModelParserParams,
    AllowedDropAggregation,
    PropertyPath,
    PageAnnotations,
    PropertyMessage,
    Location,
    UINode,
    AllowedMoveRange
} from './types';
import { AggregationActions, AggregationType, AggregationSortBy, SortingOptions, ValidationState } from './types';
import type { JSONSchema4 } from 'json-schema';
import { PageEditProperty, type PageProperties } from './PageEditProperty';
import startCase from 'lodash/startCase';
import type { I18nBundle } from '@sap-ux/i18n';
import { getAnnotationNodeById, updateAnchorSchema, resolveI18nValue, getNodeLocations } from './utils';
import type { ArtifactType, PageConfig, PageType } from '@sap/ux-specification/dist/types/src';
import { isTooComplex } from '../annotations';

export interface PageAggregations {
    [key: string]: ObjectAggregation;
}

export interface PageEditAggregationData {
    aggregations: PageAggregations;
    properties: PageProperties;
    additionalProperties?: ObjectAggregation;
    propertiesVariants?: Array<PageProperties>;
}

export interface ReorderingResult {
    oldIndex: number;
    newIndex: number;
    data?: any;
}

export interface AggregationVariant {
    properties: PageProperties;
    aggregations: PageAggregations;
}

export type SpecificationKey = {
    name: string;
    value: string;
};
export type SpecificationKeysTag = Array<SpecificationKey>;

interface NodeSorting {
    top: Array<string>;
}

const ROOT_SORTING_NAMES: NodeSorting = {
    top: ['header', 'filterBar']
};

interface AggregationUnion {
    name: string;
    originalNames: string[];
}

interface AssociatedUINode {
    node: UINode;
    direct: boolean;
}

export const CUSTOM_EXTENSION_ANCHOR_PROPERTIES = ['anchor', 'relatedFacet'];

export class ObjectAggregation {
    // Path
    public path: PropertyPath = [];
    // Standard properties for aggregation and properties
    public aggregations: PageAggregations = {};
    public properties: PageProperties = {};
    public additionalProperties?: ObjectAggregation;
    // Properties variants - multiple variation of properties and aggregations. Depending on values - other properties or aggregation may be hidden/disabled.
    public variants: Array<AggregationVariant> = [];
    // Class for child aggregations
    public childClass?: typeof ObjectAggregation;
    // Additional information text
    public additionalText?: string;
    // Aggregation actions
    public locations?: Location[];
    public actions?: SupportedAggregationActions;
    // Inactive
    public inactive?: boolean;
    // Original schema data
    public schema?: JSONSchema4;
    // Public creation form - (+) button would appear on UI and form will be opened
    public annotationCreationForms: CreationFormOptions[] = [];
    public allowedAnnotationCreationForms?: AggregationCreationForm[] = [];
    public schemaCreationForms: CreationFormOptions[] = [];
    public formSchema?: ObjectAggregation;

    public sortableList?: boolean;
    public sortableItem?: SortingOptions;
    public sortableReadonlyTooltip?: string;
    public sortableConfigOnly?: boolean;
    public order?: number;
    // Property description
    public description?: string;
    // Aggregation i18n key
    public i18nKey?: string;
    // Validation state
    public state?: ValidationState = ValidationState.Valid;
    public messages?: PropertyMessage[];
    public value: unknown;
    // Aggregation type - currently object or array
    public readonly type: AggregationType = AggregationType.Object;
    // Reference to parent aggregation
    public readonly parent?: ObjectAggregation;
    // Custom
    public custom = false;

    public isViewNode?: boolean;

    public isTable = false;

    public pattern?: string;

    public name?: string;

    public union?: AggregationUnion;

    public sortableCollection?: string;
    public annotationNodeId?: number[];
    public dropUINodes?: Record<string, boolean>;
    // Is aggregation pending and not fully ready for edit
    public pending?: PendingChange;
    public hidden?: boolean;
    // Aggregation's artifact type
    public artifactType?: ArtifactType;
    // Is virtual node - means that node is not presented in source code and visible only on UI
    public virtual?: boolean;
    // Visualisation icon for aggregation
    public icon?: string;
    // Is aggregation atomic - it means that value is number/string/boolean
    public isAtomic?: boolean;
    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        if (data) {
            this.aggregations = data.aggregations;
            this.properties = data.properties;
        }
        if (schema) {
            this.schema = schema;
        }
    }

    /**
     * Method adds aggregation object.
     *
     * @param name Name of aggregation.
     * @param aggregation Aggregation to add.
     * @param path Array of path to aggregation.
     * @param order Order index.
     * @param overwrite Overwrite existing aggregation.
     * @returns Added aggregation.
     */
    public addAggregation(
        name: string,
        aggregation: ObjectAggregation,
        path: PropertyPath,
        order?: number,
        overwrite?: boolean
    ): ObjectAggregation {
        if (this.aggregations[name] && !overwrite) {
            return this.aggregations[name];
        }
        // Append new
        aggregation.name = name;
        if (order !== undefined && !isNaN(order)) {
            // Looks like we need place aggregation in certain place - recalculate other aggregations
            for (const key in this.aggregations) {
                const existingOrder = this.aggregations[key].order;
                if (existingOrder !== undefined && !isNaN(existingOrder) && existingOrder >= order) {
                    this.aggregations[key].order = existingOrder + 1;
                }
            }
            aggregation.order = order;
        } else {
            aggregation.order = Object.keys(this.aggregations).length;
        }
        // Define parent, but as not writable
        Object.defineProperty(aggregation, 'parent', {
            value: this,
            writable: false
        });
        this.aggregations[name] = aggregation;
        // Update path and apply path to childs
        this.updatePath(this.aggregations[name], path);
        return aggregation;
    }

    /**
     * Method adds property object.
     *
     * @param name Name of property.
     * @param schema Schema object of property.
     * @returns Instance of new property.
     */
    public addProperty(name: string, schema: JSONSchema4): PageEditProperty {
        if (CUSTOM_EXTENSION_ANCHOR_PROPERTIES.includes(name)) {
            schema = updateAnchorSchema(this, schema);
        }
        const displayName = schema.displayName || startCase(name);
        const property = new PageEditProperty(schema, displayName);
        this.properties[name] = property;
        return property;
    }

    /**
     * Public method returns display name of aggregation.
     * Is used as display name in outline.
     *
     * @param i18nBundle I18n translation entries which should be looked up if display value persists.
     * @returns Display name of aggregation with applied i18n.
     */
    public getDisplayName(i18nBundle: I18nBundle = {}): string {
        const nameResolutionMethods = [
            // Read translatable value
            (): string | undefined => {
                const name = this.getRawDisplayName();
                const i18nValue = resolveI18nValue(name, i18nBundle);
                if (i18nValue) {
                    return i18nValue;
                }
                return name;
            },
            // Use technical name resolution method - not every aggregations support it
            this.getTechnicalName.bind(this),
            // Use name property based on property key in schema path
            (): string | undefined => {
                const name = this.getFormattedName();
                return name ? startCase(name) : undefined;
            }
        ];
        let displayName = '';
        for (const resolutionMethod of nameResolutionMethods) {
            displayName = resolutionMethod() || '';
            if (displayName) {
                break;
            }
        }
        return displayName;
    }

    public getSupportedActions(): SupportedAggregationActions {
        const actions = [...(this.actions ?? [])];
        if (this.locations && this.locations.length) {
            actions.push(AggregationActions.OpenSource);
        }
        return actions;
    }

    /**
     * Public method that returns keys from schema for an aggregation object.
     *
     * @returns Array of keys.
     */
    public getKeys(): SpecificationKeysTag | undefined {
        if (this.schema?.keys) {
            return this.schema.keys as SpecificationKeysTag;
        } else {
            return undefined;
        }
    }

    /**
     * Method returns value of passed schema key.
     *
     * @param name Name to search.
     * @returns Value for passed key's name.
     */
    public getValueOfSchemaKey(name: string): string | undefined {
        const keyObject = this.getKeys()?.find((schemaKey: SpecificationKey) => schemaKey.name === name);
        return keyObject?.value;
    }

    /**
     * Public method that returns technical name for an aggregation object.
     * Currently it is used to display in tooltip.
     *
     * @returns technical name.
     */
    public getTechnicalName(): string | undefined {
        return undefined;
    }

    /**
     * Protected method returns display name of aggregation without applying i18n translation.
     *
     * @returns Display name of aggregation.
     */
    protected getRawDisplayName(): string {
        if (this.isViewNode) {
            const description = this.formatTextForDisplay(this.description);
            if (description) {
                return description;
            }
        }
        return this.formatTextForDisplay(this.schema?.title);
    }

    /**
     * Method formats text for display.
     * Trim is used to avoid whitespaces.
     *
     * @param text Text to format.
     * @returns Formatted text.
     */
    private formatTextForDisplay(text = ''): string {
        return text.trim();
    }

    /**
     * Method updates value of aggregatipn properties and child aggregations.
     *
     * @param data Data which should be used for value population.
     */
    private updateValues(data: PageData | undefined): void {
        const propertyKeys = Object.keys(this.properties);
        const aggregationKeys = Object.keys(this.aggregations);
        if (data) {
            for (const name in data) {
                if (propertyKeys.includes(name)) {
                    this.properties[name].value = data[name];
                }
                if (aggregationKeys.includes(name)) {
                    this.aggregations[name].value = data[name];
                }
            }
        }
    }

    /**
     * Public method which recursively updates aggregation's properties with values from passed data object.
     *
     * @param data Data which should be used for value population.
     * @param page Page config data.
     * @param pageType Page type.
     * @param path Aggregation path.
     * @param annotations Page annotations.
     * @param parser Model parser parameters.
     */
    public updatePropertiesValues(
        data: PageData | undefined,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations?: PageAnnotations,
        parser?: ModelParserParams<ObjectAggregation>
    ): void {
        this.updateValues(data);
        this.updateAnnotationData(annotations);
        this.annotationCreationForms = this.getNativeNodeCreationForms(annotations);

        // Go with recursion
        for (const rootName in this.aggregations) {
            const pathPart = this.type === AggregationType.Array ? parseInt(rootName, 10) : rootName;
            const names = this.aggregations[rootName].union?.originalNames || [rootName];
            for (const name of names) {
                this.aggregations[rootName].updatePropertiesValues(
                    data?.[name] as PageData,
                    page,
                    pageType,
                    path.concat([pathPart]),
                    annotations,
                    parser
                );
            }
            this.aggregations[rootName].onPropertiesUpdated();
        }
        if (this.isAtomic) {
            this.handleAtomicObject(data, path);
        }
    }

    /**
     * Method which caled when properties and aggregation data was applied and updated.
     */
    protected onPropertiesUpdated(): void {
        return undefined;
    }

    /**
     * Refreshes internal data based on annotation node data.
     *
     * @param annotations
     */

    public updateAnnotationData(annotations: PageAnnotations | undefined): void {
        const currentUINode: AssociatedUINode | undefined = this.getCurrentUINode(annotations);
        const directNode = currentUINode?.direct ? currentUINode.node : undefined;
        this.setAllowedParents(annotations, directNode);
        this.updateLocations(annotations, directNode);

        // Handle readonly node
        if (currentUINode?.node && !isTooComplex(currentUINode.node) && currentUINode.node.readonly) {
            this.applyReadonlyAnnotationNode(currentUINode.node.readonlyTooltip);
        }
        // Check if annotation node resolution failed and we should disable sorting and deletion
        if (!this.custom && this.sortableItem === SortingOptions.Enabled && !this.annotationNodeId) {
            // Disable sorting - it is not custom extension node and annotation id resolution failed
            this.sortableItem = SortingOptions.Readonly;
            this.removeAction(AggregationActions.Delete);
        }
    }

    /**
     * Method checks if annotation contains allowedSubnodeTypes
     * and sets disabled param for add action button.
     *
     * @param annotations Page annotations.
     * @param uiNode Annotation node.
     */
    private setAllowedParents(annotations: PageAnnotations | undefined, uiNode?: UINode): void {
        if (uiNode) {
            this.dropUINodes = uiNode?.allowedParentNodes;
        }
    }

    /**
     * Refreshes node locations based on the annotation node data
     *
     * @param annotations All page annotations.
     * @param currentUINode Annotation node.
     */
    protected updateLocations(annotations: PageAnnotations | undefined, currentUINode?: UINode): void {
        this.locations = this.locations || [];
        const currentLocationsCount = this.locations.length;
        // Do not append annotation locations to macros nodes if macro node has location assigned
        if (!currentUINode || (currentLocationsCount && this.isMacrosNode())) {
            return;
        }
        const locations: Location[] = getNodeLocations(currentUINode);
        if (locations.length > 0) {
            if (currentLocationsCount) {
                // Locations exists merge locations
                for (const location of this.locations) {
                    if (locations.some((_location) => _location.fileUri !== location.fileUri)) {
                        locations.push(location);
                    }
                }
            }
            this.locations = locations;
        }
    }

    /**
     * Method provides creation options based on its related annotation node
     *
     * @param annotations Page annotations.
     */
    protected getNativeNodeCreationForms(annotations: PageAnnotations | undefined): CreationFormOptions[] {
        if (!this.name || !annotations) {
            return [];
        }

        const annotationNodeId = this.annotationNodeId || this.getParentAnnotationNodeId();
        if (!annotationNodeId) {
            return this.getDefaultNativeCreationForms(annotations);
        }
        return [];
    }

    /**
     * Method provides default creation options, when no matching annotation node exists
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getDefaultNativeCreationForms(annotations: PageAnnotations): CreationFormOptions[] {
        return [];
    }

    /**
     * Method recursively searches for parent with 'annotationNodeId' and returns 'annotationNodeId' as current context.
     *
     * @returns Annotation node id.
     */
    public getParentAnnotationNodeId(): number[] | undefined {
        let parent = this.parent;
        while (parent) {
            if (parent.annotationNodeId) {
                return parent.annotationNodeId;
            }
            parent = parent ? parent.parent : undefined;
        }
    }

    /**
     * Method get valid object of properties.
     * There can be case when aggregation can have several variants of property combination - we are returning currently valid, depending on entered values.
     *
     * @returns Object of properties.
     */
    public getProperties(): PageProperties {
        return this.properties;
    }

    /**
     * Method returns copy of ObjectAggregation object.
     *
     * @param type Type of aggregation.
     * @returns Copy of ObjectAggregation.
     */
    public getCopy(type: typeof ObjectAggregation = ObjectAggregation): ObjectAggregation {
        const cloneData = JSON.parse(
            JSON.stringify(this, (key: string, value: unknown): unknown => {
                if (key === 'parent') {
                    return undefined;
                }
                return value;
            })
        ) as PageEditAggregationData;
        const cloneObject = new type(cloneData);
        this.createAggregations(cloneObject, type);
        return new type(cloneObject);
    }

    /**
     * Recursive method to use for copying aggregations objects.
     *
     * @param aggregation Original aggregation for copy.
     * @param type Type of aggregation.
     */
    private createAggregations(
        aggregation: ObjectAggregation,
        type: typeof ObjectAggregation = ObjectAggregation
    ): void {
        if (!aggregation.aggregations) {
            return;
        }
        for (const name in aggregation.aggregations) {
            aggregation.aggregations[name] = new type(aggregation.aggregations[name]);
            this.createAggregations(aggregation.aggregations[name]);
        }
        if (aggregation.additionalProperties && aggregation.additionalProperties.aggregations) {
            aggregation.additionalProperties = new type(aggregation.additionalProperties);
        }
    }

    /**
     * Method sorts aggregation by 'order' property.
     *
     * @param name1 Aggregation name.
     * @param name2 Aggregation name.
     * @returns Sort result.
     */
    private aggregationOrderSorter(name1: string, name2: string): number {
        // Ordering when order is represented in aggregation
        const order1 = this.aggregations[name1] ? this.aggregations[name1].order || -1 : -1;
        const order2 = this.aggregations[name2] ? this.aggregations[name2].order || -1 : -1;
        if (order1 === order2) {
            return 0;
        }
        return order1 > order2 ? 1 : -1;
    }

    /**
     * Method returns array of ordered aggregation keys/names.
     *
     * @param viewNodesOnly Return only aggregations for view.
     * @param sortBy Sorting type. Currently aggregations can be sorted by 'ViewNode' to move visible nodes to top.
     * @returns Array of aggregations keys/names.
     */
    public getAggregationKeys(viewNodesOnly = false, sortBy?: AggregationSortBy): Array<string> {
        let aggregationKeys = Object.keys(this.aggregations).sort(this.aggregationOrderSorter.bind(this));
        if (!this.sortableList) {
            // Like 'header', 'filter' - render on top if aggregations are not sortable in UI.
            aggregationKeys = aggregationKeys.sort((obj1: string, obj2: string) => {
                // index of first priority prop
                const indexOfFirstRoot = ROOT_SORTING_NAMES.top.indexOf(obj1);
                // index of second priority prop
                const indexOfSecondRoot = ROOT_SORTING_NAMES.top.indexOf(obj2);
                if (indexOfFirstRoot !== -1 && indexOfSecondRoot !== -1 && indexOfFirstRoot > indexOfSecondRoot) {
                    return 1;
                }
                if (indexOfFirstRoot !== -1) {
                    return -1;
                }
                return indexOfSecondRoot !== -1 ? 1 : 0;
            });
        }
        if (viewNodesOnly) {
            aggregationKeys = aggregationKeys.filter(
                (key: string) => this.aggregations[key].isViewNode && !this.aggregations[key].hidden
            );
        }
        if (sortBy === AggregationSortBy.ViewNode) {
            aggregationKeys = aggregationKeys.sort(this.getViewNodeSorter.bind(this));
        }
        return aggregationKeys;
    }

    /**
     * Aggregation key sorter by view node.
     * Sorter also sorts by aggregation key in scope of save view node group.
     *
     * @param key1 First aggregation key.
     * @param key2 Second aggregation key.
     * @returns Sorter result.
     */
    private getViewNodeSorter(key1: string, key2: string): number {
        const isViewNode1 = this.aggregations[key1].isViewNode;
        const isViewNode2 = this.aggregations[key2].isViewNode;
        if (isViewNode1 === isViewNode2 && !isViewNode1) {
            // If view node is same, then sort by key
            if (key1 === key2) {
                return 0;
            } else if (key1 > key2) {
                return 1;
            } else {
                return -1;
            }
        }
        // sort by view node
        if (this.aggregations[key1].isViewNode === this.aggregations[key2].isViewNode) {
            return 0;
        } else if (this.aggregations[key1].isViewNode) {
            return 1;
        } else {
            return -1;
        }
    }

    /**
     * Method updates path recursively.
     *
     * @param aggregation Aggregation to update.
     * @param path Current path.
     */
    private updatePath(aggregation: ObjectAggregation, path: PropertyPath): void {
        aggregation.setPath(path);
        if (aggregation.aggregations) {
            for (const key in aggregation.aggregations) {
                this.updatePath(aggregation.aggregations[key], path.concat([key]));
            }
        }
    }

    /**
     * Set method to store path of aggregation.
     *
     * @param path Path array.
     */
    protected setPath(path: PropertyPath): void {
        this.path = path;
    }

    /**
     * Method returns maximal order by looping through all properties.
     *
     * @returns Maximal property order index.
     */
    public getMaxOrder(): number {
        let maxOrder = 0;
        for (const key in this.aggregations) {
            const order = this.aggregations[key].order || 0;
            if (maxOrder < order) {
                maxOrder = order;
            }
        }
        return maxOrder;
    }

    public findMatchingParent(matchType: typeof ObjectAggregation = ObjectAggregation): ObjectAggregation | undefined {
        let parent = this.parent;
        while (parent) {
            if (parent instanceof matchType) {
                return parent;
            }
            parent = parent ? (parent as ObjectAggregation).parent : undefined;
        }
    }

    /**
     * Method enables union handling by adding setting union name and passing original name of aggregation.
     *
     * @param name Union name for aggregation.
     * @param originalName Original name of aggregation.
     */
    public addUnionName(name: string, originalName: string): void {
        const originalNames = this.union?.originalNames || [];
        if (!originalNames.includes(originalName)) {
            originalNames.push(originalName);
        }
        this.union = {
            name,
            originalNames
        };
    }

    /**
     * Protected method which returns name with additional formatting if it is unnecessary.
     * Default logic does not apply any additional formatting, but it allows to overwrite such method and provide additional logic specific to each aggregation.
     *
     * @returns Name of aggregation.
     */
    protected getFormattedName(): string | undefined {
        return this.name;
    }

    /**
     * Method returns associated annotation UI Node for aggregation.
     *
     * @param annotations Annotations data.
     * @returns Associated annotation UI Node.
     */
    private getCurrentUINode(annotations: PageAnnotations | undefined): AssociatedUINode | undefined {
        if (this.name && annotations) {
            const annotationNodeId = this.annotationNodeId || this.getParentAnnotationNodeId();
            if (annotationNodeId) {
                const currentUINode = getAnnotationNodeById(annotations, annotationNodeId);
                if (currentUINode) {
                    return {
                        node: currentUINode,
                        // If it resolved directly or by first non-virtual parent
                        direct: !!this.annotationNodeId
                    };
                }
            }
        }
    }

    /**
     * Method handles readonly annotation node by disabling actions and DnD.
     */
    protected applyReadonlyAnnotationNode(readonlyTooltip?: string): void {
        // Method to disable actions
        const disableActions = (actions: SupportedAggregationActions) => {
            for (let i = 0; i < actions.length; i++) {
                let action = actions[i];
                if (typeof action === 'string') {
                    // Simple string - make object which allow to disable action
                    actions[i] = action = {
                        type: action
                    };
                }
                action.disabled = true;
                action.title = readonlyTooltip;
            }
        };

        // Method to disable reordering
        const disableReordering = (aggregation: ObjectAggregation) => {
            aggregation.sortableItem = SortingOptions.Readonly;
            if (readonlyTooltip) {
                aggregation.sortableReadonlyTooltip = readonlyTooltip;
            }
        };

        for (const key in this.aggregations) {
            const aggregation = this.aggregations[key];
            if (aggregation.actions && !aggregation.custom) {
                disableActions(aggregation.actions);
            }
            if (aggregation.sortableItem === SortingOptions.Enabled) {
                disableReordering(aggregation);
            }
        }
        if (this.actions) {
            disableActions(this.actions);
        }
        if (this.sortableItem === SortingOptions.Enabled) {
            disableReordering(this);
        }
    }

    /**
     * Method removes passed action from visible actions.
     *
     * @param action Action to remove.
     */
    protected removeAction(action: AggregationActions): void {
        if (this.actions) {
            const actionIndex = this.actions.indexOf(action);
            if (actionIndex !== -1) {
                this.actions.splice(actionIndex, 1);
            }
        }
    }

    /**
     * Method to stringify node id to string to match 'allowedParents' properties format.
     *
     * @param annotationNodeId - Annotation node id.
     * @returns Formatted node id.
     */
    private nodeIdToString(annotationNodeId: number[]): string {
        return `[${annotationNodeId.join(',')}]`;
    }

    /**
     * Method to find all droppable collections inside aggregation by passed collection name.
     *
     * @param aggregation Current aggregation to check.
     * @param collectionName Collection name to check.
     * @returns Found droppable collections.
     */
    private findDropableCollectionsByCollection(
        aggregation: ObjectAggregation,
        collectionName?: string
    ): ObjectAggregation[] {
        const result: ObjectAggregation[] = [];
        if (aggregation.sortableList && aggregation.sortableCollection === collectionName) {
            result.push(aggregation);
        } else {
            // Continue looking inside
            for (const id in aggregation.aggregations) {
                const childAggregation = aggregation.aggregations[id];
                const foundAggregations = this.findDropableCollectionsByCollection(childAggregation, collectionName);
                result.push(...foundAggregations);
            }
        }

        return result;
    }

    /**
     * Method returns allowed drop ranges for passed source aggregation.
     *
     * @param source Source aggregation.
     * @returns Allowed drop ranges for passed source aggregation.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getAllowedDropRange(source: ObjectAggregation): AllowedMoveRange[] | undefined {
        return undefined;
    }

    /**
     * Method to find allowed drop parents for aggregation.
     *
     * @param source Source aggregation.
     * @param aggregation Aggregation to search in.
     * @returns Found allowed drop parents.
     */
    public findAllowedDropAggregations(
        source: ObjectAggregation,
        aggregation: ObjectAggregation = this
    ): AllowedDropAggregation[] {
        const { dropUINodes = {}, sortableCollection } = source;
        const result: AllowedDropAggregation[] = [];
        if (aggregation.annotationNodeId && dropUINodes[this.nodeIdToString(aggregation.annotationNodeId)]) {
            const droppableAggregations = this.findDropableCollectionsByCollection(aggregation, sortableCollection);
            // Root aggregation found - find dropable containers
            result.push(
                ...droppableAggregations.map((droppableAggregation): AllowedDropAggregation => {
                    const range = droppableAggregation.getAllowedDropRange(source);
                    return { aggregation: droppableAggregation, range };
                })
            );
        }
        for (const id in aggregation.aggregations) {
            const childAggregation = aggregation.aggregations[id];
            const foundAggregations = this.findAllowedDropAggregations(source, childAggregation);
            result.push(...foundAggregations);
        }

        return result;
    }

    /**
     * Method returns whether aggregation node has macros metadata.
     *
     * @returns Whether aggregation node is macros node.
     */
    public isMacrosNode(): boolean {
        return !!this.schema?.metadata;
    }

    /**
     * Method converts property to aggregation.
     *
     * @param key Property key/index in object.
     * @param path Aggregation path.
     */
    private convertAtomicPropertyToAggregation(key: number | string, path: PropertyPath): void {
        const aggregation = new ObjectAggregation();
        const property = key.toString();
        if (this.properties[key]) {
            aggregation.properties[property] = this.properties[key];
            aggregation.properties[property].isAtomic = true;
        }
        this.addAggregation(key.toString(), aggregation, path.concat(key));
    }

    /**
     * Method handles atomic aggregation by converting properties to aggregation.
     *
     * @param data Aggregation source data.
     * @param path Aggregation path.
     */
    private handleAtomicObject(data: PageData | undefined, path: PropertyPath): void {
        if (typeof data !== 'object') {
            return;
        }
        // Special handling for atomic arrays and objects - swap properties with aggregation
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                this.convertAtomicPropertyToAggregation(i, path);
            }
        } else {
            for (const property in data) {
                this.convertAtomicPropertyToAggregation(property, path);
            }
        }
        this.properties = {};
    }
}

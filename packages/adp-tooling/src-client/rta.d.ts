declare namespace sap {
    namespace ui {
        namespace base {
            interface ManagedObjectMetadataProperties {
                name: string;
                defaultValue: unknown | null;
                deprecated: boolean;
                getType: () => sap.ui.base.DataType;
                getName: () => string;
                getDefaultValue: () => unknown;
            }
            interface ManagedObject {
                getMetadata: () => sap.ui.base.ManagedObjectMetadata;
                getId: () => string;
                getProperty: (propertyName: string) => any;
                getBindingInfo: (name: string) => object;
            }
        }
        namespace dt {
            interface ElementOverlay extends Overlay {
                getElement: () => sap.ui.base.ManagedObject;
                getElementInstance: () => sap.ui.base.ManagedObject;
                isSelectable: () => boolean;
                setSelected: (selected: boolean) => void;
            }
            interface Overlay extends sap.ui.core.Element {
                getDesignTimeMetadata: () => DesignTimeMetadata;
            }
            interface DesignTimeMetadata extends sap.ui.base.ManagedObject {
                getData: () => {
                    properties: { [name: string]: DesignTimeMetadataData };
                    aggregations: { [name: string]: DesignTimeMetadataData };
                };
            }

            interface OverlayRegistry {
                getOverlay: (control: sap.ui.core.Element) => ElementOverlay;
            }

            interface OverlayUtil {
                getClosestOverlayFor: (control: sap.ui.core.Element) => ElementOverlay;
            }

            declare const OverlayUtil: OverlayUtil;
            declare const OverlayRegistry: OverlayRegistry;

            interface DesignTimeMetadataData {
                name: string;
                ignore: boolean;
                defaultValue: unknown;
                deprecated: boolean | undefined;
                specialIndexHandling?: boolean;
            }

            namespace plugin {
                interface ContextMenu {
                    addMenuItem(item: { id: string; text: string; handler: Function; icon?: string });
                }
            }
        }
        namespace fl {
            /**
             *
             */
            export class Utils {
                /**
                 *
                 */
                static checkControlId(control: sap.ui.base.ManagedObject): boolean;
            }
            type Layer = 'USER' | 'PUBLIC' | 'CUSTOMER' | 'CUSTOMER_BASE' | 'PARTNER' | 'VENDOR' | 'BASE';

            interface Change extends sap.ui.base.ManagedObject {
                getDefinition: () => ChangeDefinition;
            }

            interface ChangeDefinition {
                service: string;
                changeType: string;
                packageName: string;
                support: {
                    generator: string;
                };
            }
        }
        namespace rta {
            interface RuntimeAuthoring {
                attachSelectionChange: (handler: (event: sap.ui.base.Event) => void) => void;
                attachModeChanged: (handler: (event: sap.ui.base.Event) => void) => void;
                attachUndoRedoStackModified: (handler: (event: sap.ui.base.Event) => void) => void;
                getCommandStack: () => sap.ui.rta.command.Stack;
                getService: <T>(name: 'outline' | string) => Promise<T>;
                getSelection: () => sap.ui.dt.ElementOverlay[];
                getDefaultPlugins: () => { contextMenu: sap.ui.dt.plugin.ContextMenu };
            }
            interface OutlineService {
                get: () => Promise<OutlineViewNode[]>;
                attachEvent: <T>(eventName: string, handler: (params: T) => void) => void;
            }

            interface OutlineViewNode {
                id: string;
                type: 'aggregation' | 'element';
                technicalName: string;
                editable: boolean;
                elements?: OutlineViewNode[];
                visible?: boolean;
                instanceName?: string;
                name?: string;
                icon?: string;
            }
            namespace command {
                interface Stack {
                    pushAndExecute(command: BaseCommand): Promise<void>;
                    getCommands(): BaseCommand[];
                    getAllExecutedCommands(): BaseCommand[];
                }

                interface BaseCommand extends sap.ui.base.ManagedObject {
                    execute: () => Promise<void>;
                    getElement: () => sap.ui.core.Element;
                }
                interface FlexCommand extends BaseCommand {
                    getPreparedChange: () => sap.ui.fl.Change;
                }

                interface FlexSettings {
                    layer: Layer;
                    developerMode: boolean;
                    baseId?: string;
                    projectId?: string;
                    scenario?: string;
                }

                /**
                 *
                 */
                export class CommandFactory {
                    /**
                     *
                     */
                    static getCommandFor<T extends BaseCommand = BaseCommand>(
                        control: sap.ui.core.Element | string,
                        commandType: string,
                        settings: any,
                        designTimeMetadata?: sap.ui.dt.DesignTimeMetadata | null,
                        flexSettings?: FlexSettings
                    ): Promise<T>;
                }
            }
        }
    }
}

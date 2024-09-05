export const getNameMock = jest.fn();

export const registry = new Map<string, DataTypeMock>();

export default class DataTypeMock {
    getName(): string {
        return undefined as unknown as string;
    }
    getBaseType(): DataTypeMock | undefined {
        return undefined;
    }

    static getType(name: string) {
        const type = registry.get(name);
        if (type) {
            return type;
        }
        console.warn(`Data type "${name} is not found, returning default mock.`);
    }

    static registerEnum(name: string, options: Record<string, string>) {
        const enumType = createEnum(name, options);
        registry.set(name, enumType);
    }

    static registerType(name: string, baseType?: DataTypeMock) {
        const dataType = createType(name, baseType);
        registry.set(name, dataType);
    }
}
export class PrimitiveDataTypeMock extends DataTypeMock {
    constructor(private name: string, private baseType?: DataTypeMock) {
        super();
    }

    getName() {
        return this.name;
    }

    getBaseType() {
        return this.baseType;
    }
}

function createType(name: string, baseType?: DataTypeMock): DataTypeMock {
    const base = baseType ?? DataTypeMock.prototype;
    const dataType = Object.create(base) as DataTypeMock;

    dataType.getName = function () {
        return name;
    };

    dataType.getBaseType = function () {
        return baseType;
    };

    return dataType;
}

const StringType = createType('string');
registry.set(StringType.getName(), StringType);

function createEnum(name: string, options: Record<string, string>): DataTypeMock {
    const dataType = Object.create(DataTypeMock.prototype) as DataTypeMock & {
        getEnumValues: () => Record<string, string>;
    };

    dataType.getName = function () {
        return name;
    };

    dataType.getBaseType = function () {
        return StringType;
    };

    dataType.getEnumValues = function () {
        return options;
    };

    return dataType;
}

DataTypeMock.registerType('sap.ui.core.URI', StringType);
DataTypeMock.registerType('sap.ui.core.CSSSize', StringType);
DataTypeMock.registerEnum('sap.ui.core.aria.HasPopup', { None: 'None', Menu: 'Menu', ListBox: 'ListBox' });

import 'reflect-metadata';

const SERIALIZABLE = Symbol('serializable');

export function serializable<T extends object>(target: T, key: string): void {
    const serializableProperties: Set<string> = Reflect.getOwnMetadata(SERIALIZABLE, target.constructor) || new Set();
    Reflect.defineMetadata(SERIALIZABLE, serializableProperties.add(key), target.constructor);
}

export function getSerializableProperties<T extends object>(target: T): Array<keyof T> {
    const props: Set<keyof T> = Reflect.getOwnMetadata(SERIALIZABLE, target.constructor);
    return (props && Array.from(props.values())) || [];
}

const SENSITIVE = Symbol('sensitive');

export function sensitiveData<T extends object>(target: T, key: string): void {
    const sensitiveProperties: Set<string> = Reflect.getOwnMetadata(SENSITIVE, target.constructor) || new Set();
    Reflect.defineMetadata(SENSITIVE, sensitiveProperties.add(key), target.constructor);
}

export function getSensitiveDataProperties<T extends object>(target: T): Array<keyof T> {
    const props: Set<keyof T> = Reflect.getOwnMetadata(SENSITIVE, target.constructor);
    return (props && Array.from(props.values())) || [];
}

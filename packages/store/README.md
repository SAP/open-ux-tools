# @sap-ux/store

This is a store for persistent data in Fiori tools.

# Usage
Add `@sap-ux/store` to your projects `package.json` to include it in your module.

# API

The main API to this module is `getService()`. Given an optional logger and an entity name, this function will return an instance of a class with the following methods:
```typescript
interface Service<Entity, EntityKey> {
    read(key: EntityKey): Promise<Entity | undefined>;
    write(entity: Entity): Promise<Entity | undefined>;
    delete(entity: Entity): Promise<boolean>;
    getAll(): Promise<Entity[] | []>;
}
```

Currently, `'system'`, `'telemetry'` and `'api-hub'`  are the only supported entities. Support for `'user'` may be added in the future.
Unsupported entity names will result in an error being thrown.

# Recommended way to add support for a new entity

(Please read the code for the system entity starting here for a concrete example: [./src/services/backend-system.ts](./src/services/backend-system.ts))
## Add a service
This needs to needs to implement the `Service<Entity, EntityKey>` interface shown above. This is what the external clients of the API will use.

Optionally, you may need to migrate data if the underlying schema changes. You may choose to do this as a single-shot one-off procedure or do it on the fly when any of the service methods are accessed. Code for an [example](./docs/example-migration-service.md) migration service (no-op).
## Add a data provider
It is recommended that the `DataProvider` interface be used to create a data provider for the new entity. This class' concern will purely be managing the persistence of the entity. The service interface may have other concerns like the data migration step in the system store.

Recommended interfaces to implement:
```typescript
interface DataProvider<E, K extends EntityKey<E>> {
    read(key: K): Promise<E | undefined>;
    write(entity: E): Promise<E | undefined>;
    delete(entity: E): Promise<boolean>;
    getAll(): Promise<E[] | []>;
}
```

Implement the static side of the interface for the constructor:
```typescript
interface DataProviderConstructor<E, K extends EntityKey<K>> {
    new (logger: Logger): DataProvider<E, K>;
}
```

Data providers can delegate to data accessors.

### Data accessors
The following data accessors are currently available:

#### Filesystem accessor

This stores the entities on the filesystem inside the Fiori Tools directory (Uses: `getFioriToolsDirectory()` from `@sap-ux/common-utils`)

#### Hybrid accessor
This stores information on the filesystem and the system's secure store.

## Add an entity

Entity classes are simple. They don't do much other than list the properties that will be serialized. `@serializable` and `@sensitiveData` are two annotations that are understood by the hybrid store.

The system entity for example looks like this:
```typescript
class BackendSystem {
    @serializable public readonly name: string;
    @serializable public readonly url: string;
    @serializable public readonly client?: string;
    @sensitiveData public readonly serviceKeys?: unknown;
    @sensitiveData public readonly username?: string;
    @sensitiveData public readonly password?: string;
    ...
    ...
}
```
Systems that are constructed using `new BackendSystem({...})` will have the properties correctly persisted in the relevant medium by the hybrid data accessor.

Every entity needs an `EntityKey` implementing this interface:
```typescript
interface EntityKey<T> {
    getId: () => string;
}
```

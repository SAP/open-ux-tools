import 'jest-extended';
import {
    getSensitiveDataProperties,
    getSerializableProperties,
    sensitiveData,
    serializable
} from '../../../src/decorators';

class HasOnlyOrdinaryProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    public toString(): string {
        return this.ordinaryProperty1 + this.ordinaryProperty2;
    }
}

class HasSerializableProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @serializable private readonly serializableProperty1 = '1';
    @serializable private readonly serializableProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 + this.ordinaryProperty2 + this.serializableProperty1 + this.serializableProperty2
        );
    }
}

class HasSensitiveDataProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @sensitiveData private readonly sensitiveDataProperty1 = '1';
    @sensitiveData private readonly sensitiveDataProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 + this.ordinaryProperty2 + this.sensitiveDataProperty1 + this.sensitiveDataProperty2
        );
    }
}

class HasSerializableAndSensitiveDataProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @sensitiveData private readonly sensitiveDataProperty1 = '1';
    @sensitiveData private readonly sensitiveDataProperty2 = '2';
    @serializable private readonly serializableProperty1 = '1';
    @serializable private readonly serializableProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 +
            this.ordinaryProperty2 +
            this.sensitiveDataProperty1 +
            this.sensitiveDataProperty2 +
            this.serializableProperty1 +
            this.serializableProperty2
        );
    }
}

describe('decorators', () => {
    it('Classes with no serializable & sensitive props return none', () => {
        const o = new HasOnlyOrdinaryProps();
        expect(getSerializableProperties(o)).toEqual([]);
        expect(getSensitiveDataProperties(o)).toEqual([]);
    });

    it('Classes with serializable & no sensitive props return only serialized props', () => {
        const o = new HasSerializableProps();
        expect(getSensitiveDataProperties(o)).toEqual([]);
        expect(getSerializableProperties(o)).toIncludeSameMembers(['serializableProperty1', 'serializableProperty2']);
    });

    it('Classes with no serializable & but sensitive props return only sensitive props', () => {
        const o = new HasSensitiveDataProps();
        expect(getSensitiveDataProperties(o)).toIncludeSameMembers([
            'sensitiveDataProperty1',
            'sensitiveDataProperty2'
        ]);
        expect(getSerializableProperties(o)).toEqual([]);
    });

    it('Classes with serializable & sensitive props return both props', () => {
        const o = new HasSerializableAndSensitiveDataProps();
        expect(getSensitiveDataProperties(o)).toIncludeSameMembers([
            'sensitiveDataProperty1',
            'sensitiveDataProperty2'
        ]);
        expect(getSerializableProperties(o)).toIncludeSameMembers(['serializableProperty1', 'serializableProperty2']);
    });
});

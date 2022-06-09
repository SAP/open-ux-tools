import type { AbapServiceProviderExtension } from '../interface';
import XmlParser from 'fast-xml-parser';
import type { AdtCategoryTerm, AdtSchemaData } from '../types';
import { ServiceProvider } from 'index';
import 'reflect-metadata';

const ADT_DISCOVERY_URL_PATH = '/sap/bc/adt/discovery';

/**
 * If ADT schema is not loaded, send discovery request to backend to fetch the schema and cache it.
 * If ADT schema is already cached, no request is sent.
 * @param target ServiceProvider instance
 * @returns
 */
async function loadAdtDiscoverySchema(target: AbapServiceProviderExtension & ServiceProvider): Promise<void> {
    if (!target.getSchemaStore().isAdtSchemaEmpty()) {
        return;
    }

    const response = await target.get(ADT_DISCOVERY_URL_PATH, {
        headers: {
            Accept: 'application/*'
        }
    });

    const schemaData = parseAdtSchemaData(response.data);
    target.getSchemaStore().updateSchemaData(schemaData);
}

function parseAdtSchemaData(xml: string): AdtSchemaData | null {
    if (XmlParser.validate(xml) !== true) {
        return null;
    }
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };
    const obj = XmlParser.getTraversalObj(xml, options);
    const parsed = XmlParser.convertToJson(obj, options);

    if (parsed.service) {
        return parsed;
    } else {
        return null;
    }
}

const adtSchemaParamMetadataKey = 'adtSchema';

/**
 * Define adt decorator. For functions with this decorator, it makes sure ADT schema is available before calling ADT services
 * within these functions.
 * @param paraName Optional parameter name in the decorated method that should be filled with AdtCollection data with id specified by param { term }
 * @param term ADT Category term attribute in the ADT discovery schema. Uniquely identifies an AdtCollection
 * @returns
 */
export const adt = (term: AdtCategoryTerm): Function => {
    return function decorator(target: any, functionName: string, descriptor: PropertyDescriptor): void {
        const original = descriptor.value;
        if (typeof original !== 'function') {
            return;
        }
        descriptor.value = async function (...args: any[]): Promise<any> {
            await loadAdtDiscoverySchema(this);
            const adtCollection = this.getSchemaStore().getAdtCollection(term);

            const adtSchemaParamIndex = Reflect.getOwnMetadata(adtSchemaParamMetadataKey, target, functionName);
            args[adtSchemaParamIndex] = adtCollection;

            return original.apply(this, args);
        };
    };
};

export const adtSchema = (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    Reflect.defineMetadata(adtSchemaParamMetadataKey, parameterIndex, target, propertyKey);
};

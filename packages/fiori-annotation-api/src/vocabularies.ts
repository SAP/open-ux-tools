import type { AliasInformation } from '@sap-ux/odata-annotation-core-types';
import type { Vocabulary } from '@sap-ux/odata-vocabularies';

/**
 * Adds vocabularies to the alias map if they are not already present there.
 *
 * @param aliasInfo Base AliasInfo object (it will not be modified) test
 * @param vocabularies A map of vocabularies where key is the namespace of vocabulary
 * @returns A copy of the AliasInfo with added vocabularies
 */
export function addAllVocabulariesToAliasInformation(
    aliasInfo: AliasInformation,
    vocabularies: Map<string, Vocabulary>
): AliasInformation {
    const aliasInfoWithDefaults = JSON.parse(JSON.stringify(aliasInfo));
    for (const [namespace, vocabulary] of vocabularies) {
        if (!aliasInfo.aliasMapVocabulary[namespace]) {
            // add vocabulary with it's default alias
            aliasInfoWithDefaults.aliasMapVocabulary[vocabulary.namespace] = vocabulary.namespace;
            aliasInfoWithDefaults.aliasMapVocabulary[vocabulary.defaultAlias] = vocabulary.namespace;
            aliasInfoWithDefaults.aliasMap[vocabulary.namespace] = vocabulary.namespace;
            aliasInfoWithDefaults.aliasMap[vocabulary.defaultAlias] = vocabulary.namespace;
            aliasInfoWithDefaults.reverseAliasMap[vocabulary.namespace] = vocabulary.defaultAlias;
        }
    }
    return aliasInfoWithDefaults;
}

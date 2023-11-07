import * as Vocabularies from '../../tools/update';

// -----------------------------------------------------------------
// Please keep this test for easier debugging:
//
// Skipped by default. Enable for debugging, only!
// -----------------------------------------------------------------
it.skip('DEBUG ONLY: updateVocabularies', async () => {
    const vocabularies: any = await Vocabularies.updateVocabularies();
    expect(vocabularies).toBeTruthy();
});

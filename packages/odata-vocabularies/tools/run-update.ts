/* eslint-disable no-console */ // Only intend to run in CLI environment where we don't need more advanced logging
import { updateVocabularies } from './update';

updateVocabularies().catch(console.error);

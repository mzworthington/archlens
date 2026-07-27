import { convertAllRecordings } from './convertRecordings';
import { RECORD_DOCS_MEDIA } from '../helpers/docsMedia';

export default async function globalTeardown(): Promise<void> {
  if (!RECORD_DOCS_MEDIA) return;
  convertAllRecordings();
}

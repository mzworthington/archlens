import { convertAllRecordings } from './convertRecordings';
import { RECORD_DOCS_MEDIA } from '../helpers/docsMedia';

export default async function globalTeardown(): Promise<void> {
  if (!RECORD_DOCS_MEDIA) return;
  // A filtered still (`6-startup-chooser.png`) has no GIF captures to convert.
  if (process.env.DOCS_MEDIA_SKIP_GIF === '1') return;
  convertAllRecordings();
}

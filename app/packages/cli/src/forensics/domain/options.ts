export {
  DEFAULT_FORENSICS_OPTIONS,
  mergeForensicsOptions,
  type ForensicsOptions,
} from '@archlens/analysis/forensics';

export interface GitForensicsCliFlags {
  sinceDays: number | undefined;
  maxCouplingCommitFiles: number | undefined;
  glob: string | undefined;
  ignore: string[];
  targetPath: string;
}

/**
 * Sandbox ceilings for the opt-in in-tab CLI scan.
 * Higher than the lite scan so a supported repo keeps structure and git forensics.
 * Stop still drops these buffers.
 */
export const IN_TAB_CLI_MAX_FILES = 20_000;
export const IN_TAB_CLI_MAX_FILE_BYTES = 2_000_000;
export const IN_TAB_CLI_MAX_TOTAL_BYTES = 256_000_000;
export const IN_TAB_CLI_MAX_METADATA_FILES = 1_000;

import type { HarnessConfig, HarnessMode, ProfileConfig } from '../types/index.js';
export declare const PATHS: {
    readonly projectRoot: string;
    readonly harnessRuntimeDir: string;
    readonly config: string;
    readonly state: string;
    readonly logs: string;
    readonly tasks: string;
    readonly auth: string;
};
export declare function getHarnessMode(): HarnessMode;
export declare function loadHarnessConfig(): HarnessConfig;
export declare function loadProfileConfig(profileId: string): ProfileConfig;
export declare function ensureDirectories(): void;
//# sourceMappingURL=index.d.ts.map
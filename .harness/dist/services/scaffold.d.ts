import { TopicCandidate, ProfileConfig } from '../types/index.js';
export interface ScaffoldResult {
    outputDir: string;
    files: {
        'index.html': string;
        'app.js': string;
        'styles.css': string;
        'metadata.json': string;
    };
    images: string[];
    imagesToCopy: Array<{
        source: string;
        dest: string;
    }>;
    generatedAssets: Record<string, string>;
}
/**
 * Validates that generated code contains all required features
 */
export declare function validateFunctionalCompleteness(code: string, appId: string): {
    valid: boolean;
    missing: string[];
};
/**
 * Generates scaffold by COPYING template and replacing content
 * This ensures 100% functional parity with the reference template
 */
export declare function generateScaffold(topic: TopicCandidate, profile: ProfileConfig, stylesTemplate: string, templateAppId?: string): ScaffoldResult;
//# sourceMappingURL=scaffold.d.ts.map
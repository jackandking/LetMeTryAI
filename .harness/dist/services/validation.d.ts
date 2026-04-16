export interface ValidationRule {
    name: string;
    pattern: RegExp;
    critical: boolean;
    description: string;
}
export declare const CORE_VALIDATION_RULES: ValidationRule[];
export interface ValidationResult {
    valid: boolean;
    passed: string[];
    failed: Array<{
        name: string;
        description: string;
        critical: boolean;
    }>;
    score: number;
}
/**
 * Validates that generated code contains all required functionality
 */
export declare function validateCodeCompleteness(code: string, rules?: ValidationRule[]): ValidationResult;
/**
 * Validates HTML structure
 */
export declare function validateHtmlStructure(html: string): ValidationResult;
/**
 * Validates CSS completeness
 */
export declare function validateCssCompleteness(css: string): ValidationResult;
/**
 * Full scaffold validation
 */
export declare function validateScaffold(files: {
    'index.html': string;
    'app.js': string;
    'styles.css': string;
}, appId: string): {
    valid: boolean;
    results: {
        js: ValidationResult;
        html: ValidationResult;
        css: ValidationResult;
    };
};
//# sourceMappingURL=validation.d.ts.map
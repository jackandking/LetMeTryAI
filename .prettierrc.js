/**
 * Prettier Configuration for LetMeTryAI
 * Ensures consistent code formatting across the project
 */

module.exports = {
    // Basic formatting
    semi: true,
    trailingComma: 'none',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    
    // HTML formatting
    htmlWhitespaceSensitivity: 'css',
    
    // CSS formatting
    cssDeclarationSorter: 'alphabetical',
    
    // JavaScript/TypeScript
    arrowParens: 'avoid',
    bracketSpacing: true,
    bracketSameLine: false,
    
    // File-specific overrides
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2
            }
        },
        {
            files: '*.md',
            options: {
                proseWrap: 'always',
                tabWidth: 2
            }
        },
        {
            files: '*.html',
            options: {
                tabWidth: 2
            }
        },
        {
            files: '*.css',
            options: {
                tabWidth: 2
            }
        }
    ]
};
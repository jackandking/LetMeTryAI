/**
 * ESLint Configuration for LetMeTryAI
 * Enforces code quality and consistency standards
 */

module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Code Quality
        'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        'no-console': 'off', // We use console for logging
        'no-debugger': 'warn',
        'no-alert': 'warn',
        
        // Best Practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'dot-notation': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        
        // Style Guidelines
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        
        // ES6+ Features
        'prefer-const': 'error',
        'no-var': 'error',
        'prefer-arrow-callback': 'warn',
        'arrow-spacing': 'error',
        'template-curly-spacing': 'error',
        
        // Function and Variable Naming
        'camelcase': ['error', { 'properties': 'never' }],
        'func-names': ['warn', 'as-needed'],
        
        // Documentation
        'require-jsdoc': ['warn', {
            'require': {
                'FunctionDeclaration': true,
                'MethodDefinition': true,
                'ClassDeclaration': true
            }
        }],
        'valid-jsdoc': ['warn', {
            'requireReturn': false,
            'requireReturnDescription': false,
            'preferType': {
                'Boolean': 'boolean',
                'Number': 'number',
                'String': 'string',
                'Object': 'object'
            }
        }]
    },
    globals: {
        // Browser globals
        'window': 'readonly',
        'document': 'readonly',
        'console': 'readonly',
        'fetch': 'readonly',
        'Audio': 'readonly',
        'Image': 'readonly',
        
        // Application-specific globals
        'ks': 'readonly', // Mini-program API
        'getConfig': 'readonly',
        'updateConfig': 'readonly',
        'readKeyValueStore': 'readonly',
        'updateKeyValueStore': 'readonly',
        'uploadFirework': 'readonly',
        'downloadFireworks': 'readonly'
    },
    overrides: [
        {
            files: ['*.test.js', '**/__tests__/**/*.js'],
            env: {
                jest: true
            },
            rules: {
                'require-jsdoc': 'off' // Less strict for test files
            }
        }
    ]
};
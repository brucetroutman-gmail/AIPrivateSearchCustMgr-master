module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:security/recommended'
    ],
    plugins: ['security', 'no-unsanitized'],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
    },
    overrides: [
        {
            files: ['server/**/*.{js,mjs}'],
            env: {
                node: true,
                browser: false,
                es2022: true
            },
            globals: {
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly'
            },
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module'
            }
        }
    ],
    globals: {
        // Client-side globals
        loadScoreModels: 'readonly',
        exportToDatabase: 'readonly',
        showNotification: 'readonly',
        sanitizeInput: 'readonly',
        logError: 'readonly',
        toggleDarkMode: 'readonly',
        toggleMenu: 'readonly',
        toggleDeveloperMode: 'readonly', // Legacy function name for compatibility
        logger: 'readonly'
    },
    rules: {
        // Basic rules
        'no-unused-vars': 'warn',
        'no-console': 'off',
        'no-undef': 'error',
        'no-control-regex': 'off',
        'no-unused-private-class-members': 'warn',
        
        // CRITICAL Security rules - Code Injection Prevention
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        'security/detect-eval-with-expression': 'error',
        'security/detect-non-literal-fs-filename': 'error',
        'security/detect-non-literal-require': 'error',
        'security/detect-unsafe-regex': 'error',
        'security/detect-buffer-noassert': 'error',
        'security/detect-child-process': 'error',
        'security/detect-disable-mustache-escape': 'error',
        'security/detect-no-csrf-before-method-override': 'error',
        'security/detect-pseudoRandomBytes': 'error',
        'security/detect-possible-timing-attacks': 'error',
        'security/detect-new-buffer': 'error',
        
        // XSS Prevention
        'no-unsanitized/method': 'error',
        'no-unsanitized/property': 'error',
        
        // Path Traversal Prevention
        'security/detect-non-literal-fs-filename': 'error',
        
        // Code quality rules
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': 'error'
    }
};
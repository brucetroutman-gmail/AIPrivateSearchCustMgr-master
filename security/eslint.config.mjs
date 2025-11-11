/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-unsafe-regex */
import js from "@eslint/js";
import globals from "globals";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

export default [
  js.configs.recommended,
  {
    files: ["client/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      },
      ecmaVersion: 2021,
      sourceType: "module"
    },
    plugins: {
      security,
      "no-unsanitized": noUnsanitized
    },
    rules: {
      // Code Injection Prevention
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-new-buffer": "error",
      
      // XSS Prevention
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      
      "no-unused-vars": "warn",
      "no-console": "warn"
    }
  },
  {
    files: ["server/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      },
      ecmaVersion: 2021,
      sourceType: "module"
    },
    plugins: {
      security,
      "no-unsanitized": noUnsanitized
    },
    rules: {
      // Code Injection Prevention
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-new-buffer": "error",
      
      "no-unused-vars": "warn"
    }
  }
];

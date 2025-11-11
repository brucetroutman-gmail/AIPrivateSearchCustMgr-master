/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-unsafe-regex */
import security from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  {
    plugins: {
      security,
      'no-unsanitized': noUnsanitized
    },
    rules: {
      // Code injection prevention
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'security/detect-eval-with-expression': 'error',
      
      // XSS protection
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      
      // Path traversal prevention
      'security/detect-non-literal-fs-filename': 'error',
      
      // Credential security
      'security/detect-possible-timing-attacks': 'error',
      
      // CSRF protection
      'security/detect-disable-mustache-escape': 'error',
      
      // General security
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'error'
    }
  }
];
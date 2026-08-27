import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { process: 'readonly', setTimeout: 'readonly' } },
    rules: { 'no-console': 'error', 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
  }
];

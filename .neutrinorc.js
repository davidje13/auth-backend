const airbnbBase = require('@neutrinojs/airbnb-base');
const library = require('@neutrinojs/library');
const jest = require('@neutrinojs/jest');
const typescript = require('neutrino-typescript');
const typescriptLint = require('neutrino-typescript-eslint');

module.exports = {
  options: {
    root: __dirname,
    tests: 'src',
  },
  use: [
    typescript({ declaration: true }),
    typescriptLint(),
    airbnbBase({
      eslint: {
        rules: {
          'arrow-parens': ['error', 'always'],
          'operator-linebreak': ['error', 'after'],
          'object-curly-newline': ['error', {
            'multiline': true,
            'consistent': true,
            'minProperties': 5,
          }],
          'space-before-function-paren': ['off'],
          'function-paren-newline': ['off'],
          '@typescript-eslint/indent': ['error', 2],
          '@typescript-eslint/await-thenable': ['error'],
          '@typescript-eslint/ban-ts-ignore': ['error'],
          '@typescript-eslint/func-call-spacing': ['error'],
          '@typescript-eslint/member-ordering': ['error'],
          '@typescript-eslint/no-for-in-array': ['error'],
          '@typescript-eslint/no-require-imports': ['error'],
          '@typescript-eslint/no-this-alias': ['error'],
          '@typescript-eslint/no-unnecessary-qualifier': ['error'],
          '@typescript-eslint/no-unnecessary-type-assertion': ['error'],
          'no-useless-constructor': ['off'],
          'no-empty-function': ['off'],
          '@typescript-eslint/no-useless-constructor': ['error'],
          '@typescript-eslint/prefer-function-type': ['error'],
          '@typescript-eslint/prefer-includes': ['error'],
          '@typescript-eslint/prefer-regexp-exec': ['error'],
          '@typescript-eslint/prefer-string-starts-ends-with': ['error'],
          '@typescript-eslint/require-array-sort-compare': ['error'],
          '@typescript-eslint/restrict-plus-operands': ['error'],
          '@typescript-eslint/unbound-method': ['error'],
          '@typescript-eslint/explicit-function-return-type': ['error', {
            'allowTypedFunctionExpressions': true,
            'allowHigherOrderFunctions': true,
          }],
          '@typescript-eslint/no-parameter-properties': ['error', {
            'allows': ['private readonly', 'protected readonly'],
          }],
          'babel/semi': ['off'],
          '@typescript-eslint/semi': ['error'],
          '@typescript-eslint/no-non-null-assertion': ['off'],
          '@typescript-eslint/no-explicit-any': ['off'],
          'import/no-extraneous-dependencies': ['error', {
            // database connectors are optional peer dependencies
            'devDependencies': true,
          }],
          'import/extensions': ['error', 'never'],
          'jest/expect-expect': ['off'],
        },
      },
    }),
    library({
      name: 'auth-backend',
      target: 'node',
      babel: {
        presets: [
          ['@babel/preset-env', {
            useBuiltIns: false,
            targets: {
              node: '10.15',
            },
          }],
        ],
      },
    }),
    jest()
  ]
};

/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./index'),
  rules: {
    ...require('./index').rules,
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
  },
};

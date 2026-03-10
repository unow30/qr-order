/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./index'),
  env: {
    ...require('./index').env,
    browser: true,
  },
  rules: {
    ...require('./index').rules,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};

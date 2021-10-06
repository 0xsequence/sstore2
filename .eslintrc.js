module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true
  },
  extends: [
    'standard',
    'plugin:node/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  overrides: [
    {
      files: ['hardhat.config.js'],
      globals: { task: true }
    },
    {
      files: ['scripts/**'],
      rules: { 'no-process-exit': 'off' }
    },
    {
      files: ['hardhat.config.js', 'scripts/**', 'test/**'],
      rules: {
        'node/no-unpublished-require': 'off',
        semi: [2, 'never'],
        'node/no-missing-require': 'off'
      }
    }
  ]
}

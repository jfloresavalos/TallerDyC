module.exports = {
  apps: [
    {
      name: 'tallerdyc',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/tallerdyc',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
  ],
}

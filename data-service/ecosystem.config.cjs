const { join } = require('node:path');

/* pm2: `pm2 start ecosystem.config.cjs`, after `npm run build`. Node loads
   this folder's `.env` by absolute path, wherever pm2 is run from. */
module.exports = {
  apps: [
    {
      name: 'nest-app',
      script: 'dist/main.js',
      cwd: __dirname,
      node_args: `--env-file=${join(__dirname, '.env')}`,
    },
  ],
};

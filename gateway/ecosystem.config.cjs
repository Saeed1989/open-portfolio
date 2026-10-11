const { join } = require('node:path');

/* pm2: `pm2 start ecosystem.config.cjs`, after `npm run build`. gateway reads
   only the process environment, so Node loads `.env` for it. */
module.exports = {
  apps: [
    {
      name: 'gateway',
      script: 'dist/main.js',
      cwd: __dirname,
      node_args: `--env-file=${join(__dirname, '.env')}`,
    },
  ],
};

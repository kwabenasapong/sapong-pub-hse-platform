/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "sapong-platform",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/Users/kwabenasapong/Documents/Programming/Sapong Publishing House/sapong-platform/sapong-platform",
      interpreter: "/Users/kwabenasapong/.nvm/versions/node/v20.20.2/bin/node",
      env: {
        NODE_ENV: "production",
        PORT: 3050,
      },
      restart_delay: 3050,
      max_restarts: 10,
      autorestart: true,
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};

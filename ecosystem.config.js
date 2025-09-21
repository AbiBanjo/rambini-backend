module.exports = {
  apps: [
    {
      name: 'rambini-production',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3500,
      },
      env_file: '.env.production',
      log_file: './logs/production-combined.log',
      out_file: './logs/production-out.log',
      error_file: './logs/production-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'rambini-staging',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: 3501,
      },
      env_file: '.env.staging',
      log_file: './logs/staging-combined.log',
      out_file: './logs/staging-out.log',
      error_file: './logs/staging-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=512',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'rambini-test',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'test',
        PORT: 3502,
      },
      env_file: '.env.test',
      log_file: './logs/test-combined.log',
      out_file: './logs/test-out.log',
      error_file: './logs/test-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '256M',
      node_args: '--max-old-space-size=256',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-ec2-instance.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/rambini.git',
      path: '/home/ubuntu/rambini-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --only rambini-production',
      'pre-setup': ''
    },
    staging: {
      user: 'ubuntu',
      host: 'your-ec2-instance.com',
      ref: 'origin/dev',
      repo: 'https://github.com/your-username/rambini.git',
      path: '/home/ubuntu/rambini-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --only rambini-staging',
      'pre-setup': ''
    },
    test: {
      user: 'ubuntu',
      host: 'your-ec2-instance.com',
      ref: 'origin/staging',
      repo: 'https://github.com/your-username/rambini.git',
      path: '/home/ubuntu/rambini-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --only rambini-test',
      'pre-setup': ''
    }
  }
};

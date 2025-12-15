// PM2 Configuration for DKUT ML Service
// Production-ready with virtual environment

module.exports = {
  apps: [{
    name: 'dkut-ml-service',
    
    // Use virtual environment's gunicorn
    script: 'venv/bin/gunicorn',
    
    // Gunicorn arguments
    args: '--bind 0.0.0.0:5000 --workers 4 --timeout 120 --access-logfile logs/access.log --error-logfile logs/error.log app:app',
    
    // Working directory
    cwd: '/path/to/dkut-backend/ml_service',
    
    // Don't use Node.js interpreter
    interpreter: 'none',
    
    // Environment variables
    env: {
      FLASK_ENV: 'production',
      PORT: '5000',
      WORKERS: '4'
    },
    
    // Development environment
    env_development: {
      FLASK_ENV: 'development',
      FLASK_DEBUG: 'True',
      PORT: '5000'
    },
    
    // Logging
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Restart behavior
    min_uptime: '10s',
    max_restarts: 10,
    
    // Startup
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
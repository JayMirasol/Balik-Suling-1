const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/omr',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8001', // <— use 127.0.0.1 to avoid IPv6 (::1) issues
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
  app.use(
    '/health',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
};

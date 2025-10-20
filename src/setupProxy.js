const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = 'http://127.0.0.1:8001'; // use 127.0.0.1 to avoid IPv6 (::1) issues

  // Proxy standard backend APIs
  app.use(
    ['/api', '/omr', '/audio', '/health', '/dict'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'debug',
    })
  );

  // Proxy /translate only for non-GET (POST from the app). GET should fall back to CRA (SPA) to support refresh.
  app.use('/translate', (req, res, next) => {
    if (req.method === 'GET') return next();
    return createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'debug',
    })(req, res, next);
  });
};

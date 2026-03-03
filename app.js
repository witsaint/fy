const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> [fy] Ready on http://${hostname}:${port}`);
    console.log(`> [fy] NODE_ENV: ${process.env.NODE_ENV}`);

    // 通知 pm2 进程已就绪（配合 wait_ready: true）
    if (process.send) {
      process.send('ready');
    }
  });
});

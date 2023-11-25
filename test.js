const http = require('http');
const fs = require('fs');
const path = require('path');

const websiteDirectory = "html";
const port = 2828;

const server = http.createServer((req, res) => {
  const clientTimeStr = req.headers['client-time'];
  const clientTime = clientTimeStr
    ? new Date(clientTimeStr).getHours() * 60 + new Date(clientTimeStr).getMinutes()
    : new Date().getHours() * 60 + new Date().getMinutes();

  const openingHours = {
    monday: [8 * 60, 20 * 60],
    tuesday: [8 * 60, 20 * 60],
    wednesday: [8 * 60, 20 * 60],
    thursday: [8 * 60, 20 * 60],
    friday: [8 * 60, 20 * 60],
    saturday: [8 * 60, 16 * 60],
    sunday: [0, 0],
  };

  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const [openingStart, openingEnd] = openingHours[currentDay] || [0, 0];

  const directory = clientTime >= openingStart && clientTime <= openingEnd ? 'day_version' : 'night_version';

  let filePath;

  // Check if the requested URL is the root ("/")
  if (req.url === '/') {
    // Set a default file for the root URL (e.g., "index.html")
    filePath = path.join(__dirname, websiteDirectory, directory, 'index.html');
  } else {
    // Construct the file path for other URLs
    const normalizedUrl = req.url.replace(/\//g, path.sep);
    filePath = path.join(__dirname, websiteDirectory, directory, normalizedUrl);
  }

  // Log information about the request
  console.log(`Request from ${req.connection.remoteAddress} for URL: ${req.url}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': getContentType(req, filePath) });
      res.end(data);
    }
  });
});

const getContentType = (req, filePath) => {
  const extname = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
  };

  console.log('Requested URL:', req.url);
  console.log('Constructed FilePath:', filePath);

  return mimeTypes[extname] || 'application/octet-stream';
};

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
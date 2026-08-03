const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.css': 'text/css'
};

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // In development, serve manifest-dev.json when manifest.json is requested
    if (filePath === '/manifest.json') {
        filePath = '/manifest-dev.json';
    }
    
    const fullPath = path.join(__dirname, filePath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const headers = {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        res.writeHead(200, headers);
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Server running at ${url}`);
    
    // Find the real LAN IP for mobile testing
    const nets = os.networkInterfaces();
    const lanIps = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                lanIps.push(net.address);
            }
        }
    }
    if (lanIps.length > 0) {
        console.log(`Access from your phone: http://${lanIps[0]}:${PORT}`);
        if (lanIps.length > 1) {
            console.log(`  Other interfaces: ${lanIps.slice(1).map(ip => `http://${ip}:${PORT}`).join(', ')}`);
        }
    } else {
        console.log(`Access from your phone using your computer's IP address: http://[YOUR_IP]:${PORT}`);
    }
});
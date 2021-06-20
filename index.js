const { Server } = require('node-static');
const { createServer } = require('http');

const file = new Server(__dirname + '/wwwroot');

createServer((req, res) => file.serve(req, res)).listen(process.env.PORT);
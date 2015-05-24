var app = require('app');
var BrowserWindow = require('browser-window');
var os = require('os');
var ipc = require('ipc');
var net = require('net');
var fs = require('fs');

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.lastIndexOf(searchString, position) === position;
  };
}

app.on('window-all-closed', function() {
  app.quit();
});

var mainWindow = null;

var sockname = '/tmp/zoi.sock'

var server = net.createServer(function(c) {

});
server.listen(sockname);

server.on('error', function(err) {
  if (err.code !== 'EADDRINUSE') {
    console.log('unknown error')
    console.dir(err)
    process.exit(-1);
  }

  nc = net.connect({path: sockname})
  nc.on('connect', function() {
    if (process.argv.length < 3) {
      nc.write("list");
      nc.on('data', function(data) {
        console.log(data.toString())
      });
    } else {
      process.argv.slice(2).forEach(function(filename) {
        nc.write("file " + filename + "\n");
      });
      nc.end();
    }

    nc.on('close', function() {
      process.exit(0);
    });

  });
  nc.on('error', function(err) {
    console.dir(err);
    process.exit(0);
  });
})

server.on('listening', function() {
  process.on('exit', function(code) {
    fs.unlink(sockname);
  });
  process.once('SIGINT', function() {
    fs.unlink(sockname);
    process.kill(process.pid, 'SIGINT')
  });

  var ifs = [];
  var interfaces = os.networkInterfaces()
  for (var dev in interfaces) {
    interfaces[dev].forEach(function(details) {
      if (details.family === 'IPv4' && details.mac !== '00:00:00:00:00:00' && !details.internal) {
        ifs.push(details.address);
      }
    });
  }

  console.log(ifs)

  var files = process.argv.slice(2);

  app.on('ready', function() {
    mainWindow = new BrowserWindow({width: 800, height: 600});
    mainWindow.loadUrl('file://' + __dirname + '/index.html');
    mainWindow.on('closed', function() {
      mainWindow = null;
    });

    mainWindow.webContents.on('did-finish-load', function() {
      mainWindow.webContents.send('file-open', files)
      mainWindow.webContents.send('address', ifs[0])
    });

    var globalShortcut = require('global-shortcut');
    globalShortcut.register('Alt+Command+I', function() {
      mainWindow.toggleDevTools();
    });
  });

  ipc.on('announce', function(ev, msg) {
    console.log(msg)
  });
});

server.on('connection', function(c) {
  c.on('data', function(data) {
    data.toString().trim().split(/\n/).forEach(function (line) {
      if (line.slice(0, 5) === 'file ') {
        mainWindow.webContents.send('file-open', [line.slice(5)]);
      }
      console.log(line);
    });
  });
});

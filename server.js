var http = require('http'),
    static = require('node-static'),
    os = require('os'),
    fileServer = new static.Server('./public'),
    WebSocketServer = require('websocket').server,
    connections = {},
    connectionIDCounter = 0,
    info = 'INFO',
    version = 'VERSION',
    processV = process.version,
    sysStr = os.type() + ' ' + os.arch() + ' ' + os.release(),
    vJson = JSON.stringify({
        type: version,
        data: {
            info: processV,
            sys: sysStr,
        }
    });


var sysData = function () {
    return {
        type: info,
        data: {
            memory: {
                info: process.memoryUsage(),
                sys: {
                    freemem: os.freemem(),
                    totalmem: os.totalmem()
                }   

            },
            uptime: {
                info: process.uptime(),
                sys: os.uptime()
            },
            load: os.loadavg()
        }
    }
};

function dataSend(data) {
    Object.keys(connections).forEach(function (id) {
        if (connections[id].connected) {
            connections[id].send(data);
        }
    });
};

var app = http.createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    });
}).listen(20400);

var wsapp = http.createServer(function (req, res) {
    res.writeHead(202, {'Content-Type': 'text/html'});
    res.end(); 
}).listen(20500, function () {
    console.log('-={( Server Ready! )}=-');
});

var wss = new WebSocketServer({ httpServer: wsapp });

wss.on('request', function (request) {
    var connection = request.accept(null, request.remoteAddress);
        connection.id = connectionIDCounter += 1;
        connections[connection.id] = connection;
    
    connection.on('message', function (message) {
        if (message.utf8Data === version) {
            connection.send(vJson);
            connection.send(JSON.stringify(sysData()));
        } else {
            message = null;
        }
    })
    .on('error', function (error) {
        console.log(error);
        connection.close();
    })
    .on('close', function () {
        delete connections[connection.id];
    });

});

(function sendInterval() {
    dataSend(JSON.stringify(sysData()));
    setTimeout(function () {
        sendInterval()
    }, 5000);
}());

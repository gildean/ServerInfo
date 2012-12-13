var http = require('http'),
    os = require('os'),
    static = require('node-static'),
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
    }),
    history = [];

// a function that returns an object with the new data in place
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

// fill the history up first so we can start shifting it
(function initHistory() {
    var tempData = sysData().data,
        i;
    for (i = 0; i < 72; i += 1) {
        history.push(tempData);
    };
}());

// function for sending to all connected clients
function dataSend(data) {
    Object.keys(connections).forEach(function (id) {
        if (connections[id].connected) {
            connections[id].send(data);
        }
    });
};

// define the servers and start listening
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

// the websocket-server logics
var wss = new WebSocketServer({ httpServer: wsapp });

wss.on('request', function (request) {
    var connection = request.accept(null, request.remoteAddress);
        connection.id = connectionIDCounter += 1;
        connections[connection.id] = connection;
    
    connection.on('message', function (message) {
        var sending;
        if (message.utf8Data === version) {
            sending = history;
            connection.send(vJson);
            connection.send(JSON.stringify({ type: "HISTORY", data: sending }));
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

// a function for setting the interval for new data to be sent
(function sendInterval() {
    var sendData = sysData();
    history.shift();
    history.push(sendData.data);
    dataSend(JSON.stringify(sendData));
    setTimeout(function () {
        sendInterval()
    }, 5000);
}());

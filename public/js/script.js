$(function () {
    "use strict";
    
    var status = $('#status'),
        title = $('#title'),
        version = $('#version'),
        system = $('#system'),
        infomemory = $('#infomemory'),
        sysmemory = $('#sysmemory'),
        freememory = $('#freememory'),
        infouptime = $('#infouptime'),
        sysuptime = $('#sysuptime'),
        load1 = $('#load1'),
        load2 = $('#load2'),
        load3 = $('#load3'),
        now = Date.now() - 365100,
        time = now,
        tmparr = [],
        b = 10,
        c = 5,
        d = 0,
        oncearr = [b,c,d],
        connection, p, m, avg1, avg5, avg15;

    for (var i = 0; i < 72; i += 1) {
       tmparr.push({y:time += 5100, a: b, b: c, c: d});
    }

    function drawArr(data, timeStamp) {
        tmparr.shift();
        tmparr.push({y:timeStamp, a:data[0].toFixed(3), b:data[1].toFixed(3), c:data[2].toFixed(3)});
        var retarr = tmparr;
        return retarr;
    }

    var graph = Morris.Line({
        element: 'graph1',
        data: drawArr(oncearr, Date.now()),
        xkey: 'y',
        xLabels: "30sec",
        ykeys: ['a', 'b', 'c'],
        labels: ['1min', '5min', '15min'],
        lineColors: ['DodgerBlue', 'gold', 'tomato'],
        hideHover: true
    });

    function wsFail() {
        connection = null;
        status.text('failed');
        $('#main').animate({opacity: 0}, 5000);
        $('#graph1').animate({opacity: 0}, 5000);
        version.animate({opacity: 0}, 5000);
    }

    function checkWs() {
        if (window.WebSocket) {
            if ((connection && connection.readyState > 1) || !connection) {
                connection = new WebSocket(window.location.href.replace('http', 'ws'));
                status.text('connected');
            }
            setTimeout(checkWs, 10000);
        }  else {
            wsFail();
        }
    }
    checkWs();

    function isValidJSON(message) {
        try {
            return JSON.parse(message);
        } catch (e) {
            console.log('This doesn\'t look like valid JSON: ' + message);
            return false;
        }
    }

    function addVersion(data) {
        version.fadeOut(300, function () {
            version.text(data.info).fadeIn(300);
        });
        system.fadeOut(300, function () {
            system.text(data.sys).fadeIn(300);
        });
        avg1 = (data.cpus / 5).toFixed(2);
        avg5 = (data.cpus / 2).toFixed(2);
        avg15 = (data.cpus / 1.05).toFixed(2);
    }

    function drawLine(data, timeStamp) {
        graph.setData(drawArr(data, timeStamp));
    }

    function uptime(data) {
        infouptime.text(moment.humanizeDuration(data.info * 1000));
        sysuptime.text(moment.humanizeDuration(data.sys * 1000));
    }

    function memText(data) {
        infomemory.text((data.info.rss/1048576).toFixed(1));
        sysmemory.text((data.sys.totalmem/1048576).toFixed());
        freememory.text((data.sys.freemem/1048576).toFixed());
    }

    function loadText(data) {
        load1.text(data[0].toFixed(4));
        load2.text(data[1].toFixed(4));
        load3.text(data[2].toFixed(4));
    }

    function titleColor(load) {
        if (load < avg1) {
            if (!title.hasClass('min1')) {
                title.toggleClass('min1');
            }
            if (title.hasClass('min5')) {
                title.toggleClass('min5');
            }
            if (title.hasClass('min15')) {
                title.toggleClass('min15');
            }
        } else if (load >= avg15) {
            if (!title.hasClass('min15')) {
                title.toggleClass('min15');
            }
            if (title.hasClass('min5')) {
                title.toggleClass('min5');
            }
        } else if (load >= avg5 && load < avg15) {
            if (!title.hasClass('min5')) {
                title.toggleClass('min5');
            }
            if (title.hasClass('min15')) {
                title.toggleClass('min15');
            }
            if (title.hasClass('min1')) {
                title.toggleClass('min1');
            }
        }
    }
    
    function refreshInfo(data) {
        drawLine(data.load, data.time);
        uptime(data.uptime);
        memText(data.memory);
        loadText(data.load);
        titleColor(parseInt(data.load[0].toFixed()));
    }

    connection.onopen = function () {
        connection.send('VERSION');
    };
    
    connection.onerror = function (error) {
        $('body').html($('<h1>', { text: 'Error' } ));
    };

    connection.onclose = function () {
        checkWs();
    };

    connection.onmessage = function (message) {
        var json = isValidJSON(message.data),
            arr;
        if (json && json.type === 'INFO') {
            refreshInfo(json.data);
        } else if (json && json.type === 'VERSION') {
            addVersion(json.data);
        } else if (json && json.type === 'HISTORY') {
            Object.keys(json.data).forEach(function (key) {
                var data = json.data[key];
                tmparr.shift();
                tmparr.push({y:data.time,a:data.load[0].toFixed(3),b:data.load[1].toFixed(3),c:data.load[2].toFixed(3)});
                arr = tmparr;
            });
            graph.setData(arr);
        }
    };

});

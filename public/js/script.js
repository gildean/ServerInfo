$(function () {
    "use strict";
    // no point in going on if the browser sucks
    window.WebSocket = window.WebSocket || window.MozWebSocket || false;
    
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
        now = Date.now() - 370000,
        tmparr = [],
        b = 0.15,
        c = 0.125,
        d = 0.1,
        oncearr = [b,c,d],
        connection, p, m;

    (function () {
        for (p = 0; p < 72; p += 1) {
            m = (now += 5000);
            tmparr.push({y:m,a:b,b:c,c:d});
        };
    }());

    function drawArr(data) {
        tmparr.shift();
        tmparr.push({y:Date.now(), a:data[0].toFixed(3), b:data[1].toFixed(3), c:data[2].toFixed(3)});
        var retarr = tmparr;
        return retarr;
    };

    var graph = Morris.Line({
        element: 'graph1',
        data: drawArr(oncearr),
        xkey: 'y',
        ykeys: ['a', 'b', 'c'],
        labels: ['1min', '5min', '15min'],
        lineColors: ['DodgerBlue', 'gold', 'tomato'],
        hideHover: true
    });

    function wsFail() {
        connection = {};
        status.text('failed');
        $('#main').animate({opacity: 0}, 5000);
        $('#graph1').animate({opacity: 0}, 5000);
        version.animate({opacity: 0}, 5000);
        title.animate({opacity: 0}, 20000);
    };

    if (window.WebSocket) {   
        connection = new WebSocket('ws://localhost:20500/');
        status.text('connected');
    } else {
        wsFail();
    }

    function isValidJSON(message) {
        try {
            return JSON.parse(message);
        } catch (e) {
            console.log('This doesn\'t look like valid JSON: ' + message);
            return false;
        }
    };

    function addVersion(data) {
        version.fadeOut(300, function () {
            version.text(data.info).fadeIn(300);
        });
        system.fadeOut(300, function () {
            system.text(data.sys).fadeIn(300);
        });
    };

    function drawLine(data) {
        graph.setData(drawArr(data));
    };

    function uptime(data) {
        infouptime.text(moment.humanizeDuration(data.info * 1000));
        sysuptime.text(moment.humanizeDuration(data.sys * 1000));
    };

    function memText(data) {
        infomemory.text((data.info.rss/1048576).toFixed(1));
        sysmemory.text((data.sys.totalmem/1048576).toFixed());
        freememory.text((data.sys.freemem/1048576).toFixed());
    };

    function loadText(data) {
        load1.text(data[0].toFixed(4));
        load2.text(data[1].toFixed(4));
        load3.text(data[2].toFixed(4));
    };

    function titleColor(load) {
        if (load < 1) {
            if (!title.hasClass('min1')) {
                title.toggleClass('min1');
            }
            if (title.hasClass('min5')) {
                title.toggleClass('min5');
            }
            if (title.hasClass('min15')) {
                title.toggleClass('min15');
            }
        } else if (load >= 5 && !title.hasClass('min15')) {
            title.toggleClass('min15');
            if (title.hasClass('min5')) {
                title.toggleClass('min5');
            }
        } else if (load >= 1 && load < 5 && !title.hasClass('min5')) {
            title.toggleClass('min5');
            if (title.hasClass('min15')) {
                title.toggleClass('min15');
            }
        }
    };
    
    function refreshInfo(data) {
        drawLine(data.load);
        uptime(data.uptime);
        memText(data.memory);
        loadText(data.load);
        titleColor(parseInt(data.load[0].toFixed()));
    };

    connection.onopen = function () {
        connection.send('VERSION');
    };
    
    connection.onerror = function (error) {
        $('body').html($('<h1>', { text: 'Error' } ));
    };

    connection.onmessage = function (message) {
        var json = isValidJSON(message.data);
        if (json && json.type === 'INFO') {
            refreshInfo(json.data);
        } else if (json && json.type === 'VERSION') {
            addVersion(json.data);
        } 
    };

    setInterval(function () {
        if (connection.readyState !== 1) {
            wsFail();
        }
    }, 2550);

});

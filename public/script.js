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
        sends = 1,
        rising = false,
        lastload = [0,0,0],
        b = 0.15,
        c = 0.125,
        d = 0.1,
        connection, p, m;
    
    for (p = 0; p < 72; p += 1) {
        m = (now += 5000);
        tmparr.push({y:m,a:b,b:c,c:d});
    };
    
    var graph = Morris.Line({
        element: 'graph1',
        data: tmparr,
        xkey: 'y',
        ykeys: ['a', 'b', 'c'],
        labels: ['1min', '5min', '15min'],
        lineColors: ['DodgerBlue', 'gold', 'tomato'],
        hideHover: true
    });

    if (window.WebSocket) {   
        connection = new WebSocket('ws://localhost:20500/');
        status.text('connected');
    } else {
        connection = {};
        status.text('failed');
        $('#main').animate({opacity: 0}, 5000);
        version.animate({opacity: 0}, 5000);
        title.animate({opacity: 0}, 20000);
    }

    function isValidJSON(message) {
        try {
            return JSON.parse(message);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message);
            return false;
        }
    };

    function addVersion(data) {
        version.fadeOut(300, function () {
            $(this).text(data.info).fadeIn(300);
        });
        system.fadeOut(300, function () {
            $(this).text(data.sys).fadeIn(300);
        });
    };

    function drawLine(data) {
        var i;
        tmparr.splice(0, 1);
        /*if (sends%2 === 0) {
            for (i = 0; i < data.length; i += 1) {
                if (rising) {
                    data[i] = data[i] * 103 / 100;
                } else {
                    data[i] = data[i] * 95 / 100;
                }
            };
            if (data[0] > lastload[0]) {
                rising = true;
            } else {
                rising = false;
            }
        }
        sends += 1;
        lastload = data;*/
        tmparr.push({y:Date.now(), a:data[0].toFixed(3), b:data[1].toFixed(3), c:data[2].toFixed(3)});
        graph.setData(tmparr);
    };

    function uptime(data) {
        infouptime.text(moment.humanizeDuration(data.info * 1000));
        sysuptime.text(moment.humanizeDuration(data.sys * 1000));
    };

    function memText(data) {
        infomemory.text((data.info.rss/1000000).toFixed(1));
        sysmemory.text((data.sys.totalmem/1000000).toFixed());
        freememory.text((data.sys.freemem/1000000).toFixed());
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
        $('#main').html($('<h1>', { text: 'Error' } ));
    };

    connection.onmessage = function (message) {
        var json = isValidJSON(message.data);
        if (json && json.type === 'INFO') {
            refreshInfo(json.data);
        } else if (json && json.type === 'VERSION') {
            addVersion(json.data);
        } 
    };

});

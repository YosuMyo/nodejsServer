var 
express = require("express"),
app = express(),
http = require('http').Server(app),
bodyParser = require('body-parser'),
io = require('socket.io')(http),
mongoose = require('mongoose'),
Myo = require('./models/myo'),
_ = require('lodash');

var sockets = {};

mongoose.connect('mongodb://localhost/myo_database')

app.use(bodyParser());

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});

app.post('/myo', function(req, res) {
    var myo = new Myo();
    myo.name = req.params.name;

    myo.save(function(err) {
        if (err) {
            res.send(err);
        } else {
            res.json(myo);
        }
    });
});

app.get('/myo/:id', function(req, res) {
    console.log('getting myo for id=' + req.params.id);
    Myo.findById(req.params.id, function(err, myo) {
        if (err) {
            res.send(err);
        } else {
            res.json(myo);
        }
    });
});

app.post('/myo/:id/event', function(req, res) {
    console.log('invoking event on myo with id= ' + req.params.id);
    var id = req.params.id;
    var eventType = req.body.eventType;
    var event = {
        myoId: id,
        eventType: eventType,
        timestamp: req.body.timestamp
    };

    switch (eventType) {
    case 'onPair':
    case 'onConnect':
        event = _.extend(event, {
            firmwareVersion: {
                firmwareVersionMajor: req.body['firmwareVersion.firmwareVersionMajor'],
                firmwareVersionMinor: req.body['firmwareVersion.firmwareVersionMinor'],
                firmwareVersionPatch: req.body['firmwareVersion.firmwareVersionPatch'],
                firmwareVersionHardwareRev: req.body['firmwareVersion.firmwareVersionHardwareRev'],
            }
        });
        break;
    case 'onDisconnect':
    case 'onArmLost':
        // Do nothings
        break;
    case 'onArmRecognized':
        event = _.extend(event, {
            arm: req.body.arm,
            xDirection: req.body.xDirection
        });
        break;
    case 'onPose':
        event = _.extend(event, {
            pose: req.body.pose,
        });
        break;
    case 'onOrientationData':
        event = _.extend(event, {
            rotation: {
                x: req.body['rotation.x'],
                y: req.body['rotation.y'],
                z: req.body['rotation.z'],
                w: req.body['rotation.w']
            }
        });
        break;
    case 'onAccelerometerData':
        event = _.extend(event, {
            accel: {
                x: req.body['accel.x'],
                y: req.body['accel.y'],
                z: req.body['accel.z'],
            }
        });
        break;
    case 'onGyroscopeData':
        event = _.extend(event, {
            gyro: {
                x: req.body['gyro.x'],
                y: req.body['gyro.y'],
                z: req.body['gyro.z'],
            }
        });
        break;
    case 'onRssi':
        event = _.extend(event, {
            rssi: req.body.rssi
        });
        break;
    default:
        console.log('Default case');
    }
    console.log('%j', event);
    
    if (sockets[id]) {
        sockets[id].emit('myo.' + eventType, event);
    } else {
        console.log('socket for myo id = %s is not available', id);
    }
    res.json(event);
});

http.listen(3000, function() {
    console.log('listening to 3000');
});

io.on('connection', function (socket) {
    socket.on('myo_listen', function(myoId) {
        console.log('Client for socket %s is starting listening myo event for myo %s', socket, myoId)
        sockets[myoId] = socket;
    });
    console.log('Socket.io connection established');
});

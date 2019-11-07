const ioHook = require('iohook')

var prevX = 0
var prevY = 0
var currX = 0
var currY = 0
var totalDistance = 0

ioHook.on('mouseclick', event => {
    prevX = currX
    prevY = currY
    currX = event.x
    currY = event.y

    totalDistance += (Math.sqrt(Math.pow((currX - prevX),2)+Math.pow((currY - prevY),2)))
    console.log(totalDistance.toFixed(0))
});

ioHook.start();
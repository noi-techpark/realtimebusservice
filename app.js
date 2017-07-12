'use strict';

require('express-group-routes');
require("./util/utils");

const bodyParser = require('body-parser');
const connection = require("./database/connection");
const express = require('express');
const fs = require('fs');
const logger = require("./util/logger");

const v1Realtime = require("./endpoint/v1/realtime");
const v1Receiver = require("./endpoint/v1/receiver");
const v1Stops = require("./endpoint/v1/stops");
const v1Vdv = require("./endpoint/v1/vdv");

const ExtrapolatePositions = require("./operations/ExtrapolatePositions");

function logRequests(req, res, next) {
    logger.warn(`${req.method} ${req.url}`);
    next();
}

process.on('uncaughtException', function(err) {
    logger.error('Caught exception: ' + err);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at: Promise', promise, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

const app = express();

app.use(logRequests);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.raw({
    limit: '10mb'
}));

app.set('jsonp callback name', 'jsonp');

connection.connect(function (error) {
    if (error) throw error;

    logger.warn("Connected to database");

    // TODO: Start extrapolation
    // new ExtrapolatePositions().run();

    startServer()
});

function startServer() {
    app.post("/vdv", function (req, res) {
        v1Vdv.upload(req, res)
    });

    app.group("/v1", (router) => {
        router.get("/positions", function (req, res) {
            v1Realtime.positions(req, res)
        });

        router.post("/receiver", function (req, res) {
            v1Receiver.updatePositions(req, res)
        });

        router.get("/:stop/buses", function (req, res) {
            v1Stops.nextBusesAtStop(req, res)
        });

        router.get("/stops", function (req, res) {
            v1Stops.stops(req, res)
        });

        router.get("/:tripId/stops", function (req, res) {
            v1Stops.stopsForTrip(req, res)
        });
    });

    let listener = app.listen(88, function () {
        logger.warn(`Server started on port ${listener.address().port}`)
    })
}
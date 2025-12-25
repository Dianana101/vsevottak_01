"use strict";
exports.__esModule = true;
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
var auth_1 = require("./routes/auth");
var schedule_1 = require("./routes/schedule");
var analytics_1 = require("./routes/analytics");
var jobs_1 = require("./jobs");
dotenv_1["default"].config();
var app = express_1["default"]();
var PORT = process.env.PORT || 3001;
// Middleware
app.use(cors_1["default"]({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1["default"].json());
// Routes
app.use('/api/auth', auth_1["default"]);
app.use('/api/schedule', schedule_1["default"]);
app.use('/api/analytics', analytics_1["default"]);
// Health check
app.get('/health', function (req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Start cron jobs
jobs_1.startCronJobs();
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 Server running on port " + PORT);
    console.log("\uD83D\uDCDD Environment: " + process.env.NODE_ENV);
});

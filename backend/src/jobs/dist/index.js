"use strict";
exports.__esModule = true;
exports.startCronJobs = void 0;
var node_cron_1 = require("node-cron");
var publishPosts_1 = require("./publishPosts");
var refreshTokens_1 = require("./refreshTokens");
function startCronJobs() {
    // Проверка и публикация постов каждые 5 минут
    node_cron_1["default"].schedule('*/5 * * * *', publishPosts_1.publishScheduledPosts);
    console.log('📅 Cron: Publishing posts every 5 minutes');
    // Обновление токенов каждый день в 3:00 AM
    node_cron_1["default"].schedule('0 3 * * *', refreshTokens_1.refreshExpiringTokens);
    console.log('🔄 Cron: Refreshing tokens daily at 3:00 AM');
}
exports.startCronJobs = startCronJobs;

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var express_1 = require("express");
var axios_1 = require("axios");
var supabase_1 = require("../lib/supabase");
var router = express_1["default"].Router();
var INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
var INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
var REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;
var FRONTEND_URL = process.env.FRONTEND_URL;
// Инициация OAuth
router.get('/instagram/login', function (req, res) {
    var userId = req.query.user_id;
    var scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_content_publish',
        'business_management'
    ].join(',');
    var authUrl = "https://www.facebook.com/v24.0/dialog/oauth?" +
        ("client_id=" + INSTAGRAM_APP_ID + "&") +
        ("redirect_uri=" + encodeURIComponent(REDIRECT_URI) + "&") +
        ("scope=" + scopes + "&") +
        ("state=" + userId + "&") +
        "response_type=code";
    res.redirect(authUrl);
});
// Обработка callback
router.get('/instagram/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, userId, tokenResponse, shortToken, longTokenResponse, longToken, expiresIn, pagesResponse, page, igUserId, expiresAt, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 5, , 6]);
                _a = req.query, code = _a.code, userId = _a.state;
                if (!code) {
                    return [2 /*return*/, res.redirect(FRONTEND_URL + "/settings?auth=failed")];
                }
                return [4 /*yield*/, axios_1["default"].get("https://graph.facebook.com/v24.0/oauth/access_token", {
                        params: {
                            client_id: INSTAGRAM_APP_ID,
                            client_secret: INSTAGRAM_APP_SECRET,
                            redirect_uri: REDIRECT_URI,
                            code: code
                        }
                    })];
            case 1:
                tokenResponse = _c.sent();
                shortToken = tokenResponse.data.access_token;
                return [4 /*yield*/, axios_1["default"].get("https://graph.facebook.com/v24.0/oauth/access_token", {
                        params: {
                            grant_type: 'fb_exchange_token',
                            client_id: INSTAGRAM_APP_ID,
                            client_secret: INSTAGRAM_APP_SECRET,
                            fb_exchange_token: shortToken
                        }
                    })];
            case 2:
                longTokenResponse = _c.sent();
                longToken = longTokenResponse.data.access_token;
                expiresIn = longTokenResponse.data.expires_in;
                return [4 /*yield*/, axios_1["default"].get("https://graph.facebook.com/v24.0/me/accounts", {
                        params: {
                            fields: 'instagram_business_account',
                            access_token: longToken
                        }
                    })];
            case 3:
                pagesResponse = _c.sent();
                page = pagesResponse.data.data[0];
                igUserId = (_b = page === null || page === void 0 ? void 0 : page.instagram_business_account) === null || _b === void 0 ? void 0 : _b.id;
                if (!igUserId) {
                    return [2 /*return*/, res.redirect(FRONTEND_URL + "/settings?auth=no_instagram")];
                }
                expiresAt = new Date(Date.now() + expiresIn * 1000);
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .update({
                        ig_user_id: igUserId,
                        ig_access_token: longToken,
                        ig_token_expires_at: expiresAt.toISOString()
                    })
                        .eq('id', userId)];
            case 4:
                _c.sent();
                res.redirect(FRONTEND_URL + "/settings?auth=success");
                return [3 /*break*/, 6];
            case 5:
                error_1 = _c.sent();
                console.error('OAuth error:', error_1);
                res.redirect(FRONTEND_URL + "/settings?auth=error");
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports["default"] = router;

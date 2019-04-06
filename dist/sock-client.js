"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = __importDefault(require("./socket"));
function createConnection(options) {
    let host, hostname = options.hostname, port = options.port;
    if (options.host && (!hostname || !port)) {
        host = options.host.split(':');
    }
    if (!port && host) {
        port = parseInt(host[1], 10) || 0;
    }
    if (!hostname && host) {
        hostname = host[0];
    }
    let sockedInstace = new socket_1.default(options);
    return sockedInstace.connect(port, hostname);
}
exports.default = createConnection;
;

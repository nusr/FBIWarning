"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tls_1 = __importDefault(require("tls"));
const https_1 = __importDefault(require("https"));
const sock_client_1 = __importDefault(require("./sock-client"));
class HttpsAgent extends https_1.default.Agent {
    constructor(options) {
        super();
        this.socksHost = options.socksHost || 'localhost';
        this.socksPort = options.socksPort || 1080;
    }
    createConnection(options) {
        let socksSocket = sock_client_1.default(options);
        let onProxied = socksSocket.onProxied;
        socksSocket.onProxied = function () {
            options.socket = socksSocket.socket;
            if (options.hostname) {
                options.servername = options.hostname;
            }
            else if (options.host) {
                options.servername = options.host.split(':')[0];
            }
            socksSocket.socket = tls_1.default.connect(options, function () {
                // Set the 'authorized flag for clients that check it.
                socksSocket.authorized = socksSocket.socket.authorized;
                onProxied.call(socksSocket);
            });
            socksSocket.socket.on('error', function (error) {
                socksSocket.emit('error', error);
            });
        };
        return socksSocket;
    }
}
exports.default = HttpsAgent;

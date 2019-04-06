"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const sock_client_1 = __importDefault(require("./sock-client"));
class HttpAgent extends http_1.default.Agent {
    constructor(options) {
        super();
        this.createConnection = sock_client_1.default;
    }
}
exports.default = HttpAgent;

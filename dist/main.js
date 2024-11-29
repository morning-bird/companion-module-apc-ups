"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
const base_1 = require("@companion-module/base");
const base_2 = require("@companion-module/base");
const config_1 = require("./config");
const variables_1 = require("./variables");
const presets_1 = require("./presets");
const ssh2_1 = require("ssh2");
const snmp_native_1 = __importDefault(require("snmp-native"));
const actions_1 = require("./actions");
exports.Constants = {
    CMD_ERROR_VAR_NAME: "returnedError",
    CMD_ERROR_FEEDBACK_NAME: "commandErrorState",
    CMD_STATUS_ON: "on",
    RECONNECT_INVERVAL_MS: 1000,
};
class ModuleInstance extends base_1.InstanceBase {
    reconnectTimer;
    sshClient;
    puller;
    session;
    config = {
        host: '',
        port: 22,
        username: 'apc',
        password: '',
        pullingTime: 60000,
    };
    APC_Data = {
        ups_type: '',
        battery_capacity: 0,
        battery_runtime_remain: 0,
    };
    constructor(internal) {
        super(internal);
    }
    destroySSH() {
        if (this.sshClient !== undefined) {
            // clean up the SSH connection
            this.sshClient.destroy();
            delete this.sshClient;
            this.updateStatus(base_2.InstanceStatus.Disconnected);
        }
    }
    queueReconnect() {
        if (this.reconnectTimer !== undefined) {
            clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.initSSH();
        }, exports.Constants.RECONNECT_INVERVAL_MS);
    }
    initSSH() {
        this.destroySSH();
        if (!this.config.host) {
            return;
        }
        this.sshClient = new ssh2_1.Client();
        if (this.config.password == null || this.config.password == "") {
            this.log("error", "password is required!");
            return;
        }
        this.updateStatus(base_2.InstanceStatus.Ok);
        return;
        // const clientConfig = {
        // 	host: this.config.host,
        // 	port: this.config.port,
        // 	username: this.config.username,
        // 	password: this.config.password,
        // 	keepaliveInterval: 5000,
        // 	keepaliveCountMax: 3,
        // 	readyTimeout: 20000,
        // 	debug: (debugStr: string) => {
        // 		this.log("debug", debugStr);
        // 	},
        // };
        // this.log("debug", "try to connect to " + clientConfig.host);
        // this.updateStatus(InstanceStatus.Connecting);
        // this.sshClient.on("error", (err) => {
        // 	this.log("error", "Server connection error: " + err);
        // 	this.updateStatus(InstanceStatus.ConnectionFailure);
        // 	this.queueReconnect();
        // });
        // this.sshClient.on("end", () => {
        // 	this.log("error", "Server ended connection");
        // 	this.updateStatus(InstanceStatus.Disconnected);
        // 	this.queueReconnect();
        // });
        // this.sshClient.on("timeout", () => {
        // 	this.log("error", "Server connection timed out");
        // 	this.updateStatus(InstanceStatus.ConnectionFailure);
        // 	this.queueReconnect();
        // });
        // this.sshClient.on("connect", () => {
        // 	// once we are connected, we will change the connection status to Connecting, as we still need to auth.
        // 	this.log("debug", "Server connection successful!");
        // 	this.updateStatus(InstanceStatus.Connecting);
        // });
        // this.sshClient.on("ready", () => {
        // 	this.log("debug", "Server connection ready!");
        // 	// this.sshClient?.shell((err, stream) => {
        // 	// 	if (err) throw err;
        // 	// 	stream
        // 	// 		.on("close", (data: any) => {
        // 	// 			this.log("debug", "Shell stream closed");
        // 	// 			this.queueReconnect();
        // 	// 		})
        // 	// 		.on("data", (data: any) => {
        // 	// 			const dataStr = data.toString();
        // 	// 			// Cek untuk Outlet1, Outlet2, atau Outlet3
        // 	// 			const outletMatch = dataStr.match(
        // 	// 				/Outlet([\d]) State:\s*(\w+)/i
        // 	// 			);
        // 	// 			if (outletMatch) {
        // 	// 				const outletNumber = outletMatch[1];
        // 	// 				const state = outletMatch[2];
        // 	// 				this.log(
        // 	// 					"info",
        // 	// 					`Outlet${outletNumber} State: ${state}`
        // 	// 				);
        // 	// 			}
        // 	// 		})
        // 	// 		.stderr.on("data", (data) => {
        // 	// 			this.log("error", "STDERR: " + data);
        // 	// 		});
        // 	// 	setTimeout(() => {
        // 	// 		stream.end("ups -os 1\n");
        // 	// 	}, 100);
        // 	// });
        // 	this.updateStatus(InstanceStatus.Ok);
        // });
        // try {
        // 	this.sshClient.connect({
        // 		host: this.config.host,
        // 		port: this.config.port,
        // 		username: this.config.username,
        // 		password: this.config.password,
        // 	});
        // } catch (exc: any) {
        // 	this.log("error", "initiating connection failed, error: " + exc);
        // 	this.updateStatus(InstanceStatus.ConnectionFailure);
        // 	return;
        // }
    }
    async init(config) {
        this.config = config;
        await this.configUpdated(this.config);
        if (this.puller)
            clearInterval(this.puller);
        (0, variables_1.initVariables)(this);
        this.setPresetDefinitions((0, presets_1.GetPresetList)());
        this.setActionDefinitions((0, actions_1.getActionDefinitions)(this));
        this.startConnection();
        this.initSSH();
    }
    // When module gets deleted
    async destroy() {
        if (this.puller) {
            delete this.puller;
            clearInterval(this.puller);
        }
        this.log('debug', 'destroy');
        return;
    }
    /**
     * Process an updated configuration array.
     */
    async configUpdated(config) {
        this.config = config;
        if (this.puller)
            clearInterval(this.puller);
        this.startConnection();
    }
    /**
     * Creates the configuration fields for web config.
     */
    getConfigFields() {
        return (0, config_1.GetConfigFields)();
    }
    startConnection() {
        // Only create a new session when needed
        if (!this.session) {
            // Create new session
            this.session = new snmp_native_1.default.Session();
            this.log('debug', 'session created: ' + JSON.stringify(this.session));
        }
        this.updateStatus(base_2.InstanceStatus.UnknownWarning);
        this.puller = setInterval(() => {
            this.pullData();
        }, this.config.pullingTime);
    }
    pullAPCStatus() {
        if (!this.sshClient)
            return;
        // this.sshClient.
    }
    pullData() {
        /**
         * oids
         * UPS Type 				1.3.6.1.4.1.318.1.1.1.1.1.1.0
         * Battery capacity 		1.3.6.1.4.1.318.1.1.1.2.2.1.0
         * Battery runtime remain 	1.3.6.1.4.1.318.1.1.1.2.2.3.0
         */
        const oids = [
            [1, 3, 6, 1, 4, 1, 318, 1, 1, 1, 1, 1, 1, 0],
            [1, 3, 6, 1, 4, 1, 318, 1, 1, 1, 2, 2, 1, 0],
            [1, 3, 6, 1, 4, 1, 318, 1, 1, 1, 2, 2, 3, 0],
        ];
        this.log('debug', 'Pulling, can take up to a minute');
        this.session.getAll({ oids: oids, host: this.config.host }, (error, varbinds) => {
            if (error) {
                this.log('error', error);
            }
            else {
                this.updateStatus(base_2.InstanceStatus.Ok);
                varbinds.forEach((vb) => {
                    this.log('debug', vb.oid + ' = ' + vb.value);
                    if (vb.oid.toString() === '1,3,6,1,4,1,318,1,1,1,1,1,1,0') {
                        this.APC_Data.ups_type = vb.value;
                    }
                    else if (vb.oid.toString() === '1,3,6,1,4,1,318,1,1,1,2,2,1,0') {
                        const value = vb.value;
                        this.APC_Data.battery_capacity = Math.round(value);
                        // this.APC_Data.battery_capacity = vb.value as number
                    }
                    else if (vb.oid.toString() === '1,3,6,1,4,1,318,1,1,1,2,2,3,0') {
                        this.APC_Data.battery_runtime_remain = vb.value;
                    }
                    else {
                        this.log('debug', vb.oid + ' = ' + vb.value);
                    }
                });
            }
            (0, variables_1.checkVariables)(this);
        });
        // this.session.close()
    }
}
exports.default = ModuleInstance;
(0, base_2.runEntrypoint)(ModuleInstance, []);
//# sourceMappingURL=main.js.map
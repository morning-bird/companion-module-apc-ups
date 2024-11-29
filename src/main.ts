import { InstanceBase, SomeCompanionConfigField } from '@companion-module/base'
import { APS_Data_Interface } from './utils'

import { runEntrypoint, InstanceStatus } from '@companion-module/base'
import { DeviceConfig, GetConfigFields } from './config'
import { checkVariables, initVariables } from './variables'
import { GetPresetList } from './presets'
import { Client } from 'ssh2'
import snmp from 'snmp-native'
import { getActionDefinitions } from './actions'


export const Constants = {
	CMD_ERROR_VAR_NAME: "returnedError",
	CMD_ERROR_FEEDBACK_NAME: "commandErrorState",
	CMD_STATUS_ON: "on",
	RECONNECT_INVERVAL_MS: 1000,
};

export default class ModuleInstance extends InstanceBase<DeviceConfig> {
	private reconnectTimer: NodeJS.Timer | undefined
	public sshClient: Client | undefined
	private puller: NodeJS.Timer | undefined
	private session: any
	public config: DeviceConfig = {
		host: '',
		port: 22,
		username: 'apc',
		password: '',
		pullingTime: 60000,
	}

	public APC_Data: APS_Data_Interface = {
		ups_type: '',
		battery_capacity: 0,
		battery_runtime_remain: 0,
	}

	constructor(internal: unknown) {
		super(internal)
	}

	destroySSH() {
		if (this.sshClient !== undefined) {
			// clean up the SSH connection
			this.sshClient.destroy();
			delete this.sshClient;
			this.updateStatus(InstanceStatus.Disconnected);
		}
	}

	queueReconnect() {
		if (this.reconnectTimer !== undefined) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			this.initSSH();
		}, Constants.RECONNECT_INVERVAL_MS);
	}

	initSSH() {
		this.destroySSH();
		if (!this.config.host) {
			return;
		}
		this.sshClient = new Client();
		if (this.config.password == null || this.config.password == "") {
			this.log("error", "password is required!");
			return;
		}
		this.updateStatus(InstanceStatus.Ok);
		return
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

	public async init(config: DeviceConfig): Promise<void> {
		this.config = config
		await this.configUpdated(this.config)

		if (this.puller) clearInterval(this.puller)

		initVariables(this)
		this.setPresetDefinitions(GetPresetList())
		this.setActionDefinitions(getActionDefinitions(this));
		this.startConnection()
		this.initSSH()
	}

	// When module gets deleted
	public async destroy(): Promise<void> {
		if (this.puller) {
			delete this.puller
			clearInterval(this.puller)
		}
		this.log('debug', 'destroy')
		return
	}

	/**
	 * Process an updated configuration array.
	 */
	public async configUpdated(config: DeviceConfig): Promise<void> {
		this.config = config
		if (this.puller) clearInterval(this.puller)
		this.startConnection()
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	public getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	startConnection() {
		// Only create a new session when needed
		if (!this.session) {
			// Create new session
			this.session = new snmp.Session()
			this.log('debug', 'session created: ' + JSON.stringify(this.session))
		}
		this.updateStatus(InstanceStatus.UnknownWarning)

		this.puller = setInterval(() => {
			this.pullData()
		}, this.config.pullingTime)
	}

	pullAPCStatus() {
		if (!this.sshClient) return;
		// this.sshClient.
	}

	pullData() {
		/**
		 * oids
		 * UPS Type 				1.3.6.1.4.1.318.1.1.1.1.1.1.0
		 * Battery capacity 		1.3.6.1.4.1.318.1.1.1.2.2.1.0
		 * Battery runtime remain 	1.3.6.1.4.1.318.1.1.1.2.2.3.0
		 */
		const oids: number[][] = [
			[1, 3, 6, 1, 4, 1, 318, 1, 1, 1, 1, 1, 1, 0],
			[1, 3, 6, 1, 4, 1, 318, 1, 1, 1, 2, 2, 1, 0],
			[1, 3, 6, 1, 4, 1, 318, 1, 1, 1, 2, 2, 3, 0],
		]
		this.log('debug', 'Pulling, can take up to a minute')
		this.session.getAll(
			{ oids: oids, host: this.config.host },
			(error: any, varbinds: any) => {
				if (error) {
					this.log('error', error)
				} else {
					this.updateStatus(InstanceStatus.Ok)
					varbinds.forEach((vb: { oid: string; value: string | number }) => {
						this.log('debug', vb.oid + ' = ' + vb.value)
						if (vb.oid.toString() === '1,3,6,1,4,1,318,1,1,1,1,1,1,0') {
							this.APC_Data.ups_type = vb.value as string
						} else if (vb.oid.toString() === '1,3,6,1,4,1,318,1,1,1,2,2,1,0') {
							const value = vb.value as number
							this.APC_Data.battery_capacity = Math.round(value)
							// this.APC_Data.battery_capacity = vb.value as number
						} else if (vb.oid.toString() === '1,3,6,1,4,1,318,1,1,1,2,2,3,0') {
							this.APC_Data.battery_runtime_remain = vb.value as number
						} else {
							this.log('debug', vb.oid + ' = ' + vb.value)
						}
					})
				}
				checkVariables(this)
			}
		)
		// this.session.close()
	}
}

runEntrypoint(ModuleInstance, [])

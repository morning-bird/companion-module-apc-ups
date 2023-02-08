const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const { checkVariables, initVariables } = require('./variables')
const snmp = require('net-snmp')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		this.puller = undefined
		this.ups_type = ''
		this.battery_capacity = ''
		this.battery_runtime_remain = ''
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		if (this.puller) clearInterval(this.puller)
		if (this.session) this.session.close()
		initVariables(this)
		this.startConnection()

		// this.updateActions() // export actions
	}

	// When module gets deleted
	async destroy() {
		if (this.puller) {
			delete this.puller
			clearInterval(this.puller)
		}
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config
		if (this.puller) clearInterval(this.puller)
		this.startConnection()
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'number',
				id: 'pullingTime',
				label: 'Set interval to pull data in msec',
				width: 8,
				min: 5000,
				max: 86400000,
				default: 60000
			},
		]
	}

	updateActions() {
		UpdateActions(this)
	}

	startConnection() {
		this.session = snmp.createSession(this.config.host, 'public')
		this.updateStatus(InstanceStatus.Ok)

		this.session.trap(snmp.TrapType.LinkDown, (error) => {
			if (error) {
				this.log('error', 'link down' + error)
			}
		})
		this.pullData()
		this.puller = setInterval(() => {
			this.pullData()
		}, this.config.pullingTime)
	}

	pullData() {
		/**
		 * oids
		 * UPS Type 				1.3.6.1.4.1.318.1.1.1.1.1.1.0
		 * Battery capacity 		1.3.6.1.4.1.318.1.1.1.2.2.1.0
		 * Battery runtime remain 	1.3.6.1.4.1.318.1.1.1.2.2.3.0
		 */
		const oids = ['1.3.6.1.4.1.318.1.1.1.1.1.1.0', '1.3.6.1.4.1.318.1.1.1.2.2.1.0', '1.3.6.1.4.1.318.1.1.1.2.2.3.0']

		this.session.get(oids, (error, varbinds) => {
			if (error) {
				this.log('error', error)
			} else {
				for (var i = 0; i < varbinds.length; i++) {
					if (snmp.isVarbindError(varbinds[i])) {
						this.log('error', snmp.varbindError(varbinds[i]))
					} else {
						this.log('debug', 'received: '+varbinds[i].oid)
						switch (varbinds[i].oid) {
							case '1.3.6.1.4.1.318.1.1.1.1.1.1.0':
								this.ups_type = varbinds[i].value
								break;
							case '1.3.6.1.4.1.318.1.1.1.2.2.1.0':
								this.battery_capacity = varbinds[i].value
								break;
							case '1.3.6.1.4.1.318.1.1.1.2.2.3.0':
								this.battery_runtime_remain = varbinds[i].value
								break;
							default:
								this.log('debug', varbinds[i].oid + ' = ' + varbinds[i].value)
								break;
						}
					}
				}
			}
			this.session.close()
			this.log('debug','ups_type'+this.ups_type)
			this.log('debug','battery_capacity'+this.battery_capacity)
			this.log('debug','battery_runtime_remain'+this.battery_runtime_remain)
			checkVariables(this)
		})
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)

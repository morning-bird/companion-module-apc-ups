import { CompanionActionDefinitions, CompanionActionEvent } from '@companion-module/base'
import ModuleInstance from './main'

function execCommand(self: ModuleInstance, cmd: string) {
	if (!self.sshClient) return
	const client = self.sshClient
	client.once('ready', () => {
		client.shell((err, stream) => {
			if (err) {
				return
			}
			stream.stderr.on('data', (data) => {
				// self.setVariableValues({
				// 	[Constants.CMD_ERROR_VAR_NAME]: true,
				// })
				// self.checkFeedbacks(self.getConstants().CMD_ERROR_FEEDBACK_NAME)
				self.log('error', 'Command: ' + cmd + ' wrote to STDERR: ' + data.toString())
			})
			stream.on('data', (data: any) => {
				self.log('debug', `Command: ${cmd} wrote to STDOUT: ${data.toString()}`)
			})
			setTimeout(() => {
				stream.end(cmd + '\n')
			}, 100);
		})
		// self.sshClient!.exec(cmd, (err, stream) => {
		// 	if (err) {
		// 		self.log('error', `Failed to execute command: ${err.message}`)
		// 		self.sshClient!.end() // Disconnect jika terjadi error
		// 		return
		// 	}

		// 	stream.stderr.on('data', (data) => {
		// 		self.log('error', `Command: ${cmd} wrote to STDERR: ${data.toString()}`)
		// 	})

		// 	stream.on('data', (data: any) => {
		// 		self.log('debug', `Command: ${cmd} wrote to STDOUT: ${data.toString()}`)
		// 	})

		// 	stream.on('close', () => {
		// 		self.log('debug', `Command: ${cmd} executed successfully`)
		// 		self.sshClient!.end() // Disconnect setelah perintah selesai
		// 	})
		// })
	})

	self.sshClient.connect({
		host: self.config.host,
		port: self.config.port,
		username: self.config.username,
		password: self.config.password,
	})
}

export async function getUpsStatus(self: ModuleInstance, outlet: string) {
	const cmd = `ups -os ${outlet}`
	const promise = new Promise((resolve, reject) => {
		self.sshClient?.shell((err, stream) => {
			if (err) {
				reject(err)
				return
			}
			stream.stderr.on('data', (data) => {
				// self.setVariableValues({
				// 	[Constants.CMD_ERROR_VAR_NAME]: true,
				// })
				// self.checkFeedbacks(self.getConstants().CMD_ERROR_FEEDBACK_NAME)
				self.log('error', 'Command: ' + cmd + ' wrote to STDERR: ' + data.toString())
			})

			stream.on('data', (data: any) => {
				const dataStr = data.toString()
				const outletMatch = dataStr.match(/Outlet([\d]) State:\s*(\w+)/i)
				if (outletMatch) {
					self.checkFeedbacks('upsStatus')
					const state = outletMatch[2]
					resolve(state)
				}
			})

			stream.write(cmd + '\n')
		})
	})
	return promise
}

export function getActionDefinitions(self: ModuleInstance): CompanionActionDefinitions {
	return {
		turnOn: {
			name: 'Turn On',
			options: [
				{
					id: 'outlet',
					type: 'number',
					label: 'Outlet',
					default: 1,
					min: 1,
					max: 10,
					required: true
				},
			],
			callback: async (action: CompanionActionEvent) => {
				const outlet = action.options.outlet!.toString()
				// const state = await getUpsStatus(self, outlet)
				// // hanya nyalakan bila memang sedang posisi mati
				// if (state === 'Off') {
				execCommand(self, `ups -o ${outlet} On`)
				self.log('debug', `Outlet${outlet} is turned On`)
				// }
			},
		},
		turnOff: {
			name: 'Turn Off',
			options: [
				{
					id: 'outlet',
					type: 'number',
					label: 'Outlet',
					default: 1,
					min: 1,
					max: 10,
					required: true
				},
			],
			callback: async (action: CompanionActionEvent) => {
				const outlet = action.options.outlet!.toString()
				// const state = await getUpsStatus(self, outlet)
				// // hanya matikan bila memang sedang posisi nyala
				// if (state === 'On') {
				execCommand(self, `ups -o ${outlet} Off`)
				self.log('debug', `Outlet${outlet} is turned Off`)
				// }
			},
		},
	}
}

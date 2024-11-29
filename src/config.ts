import { Regex, SomeCompanionConfigField } from '@companion-module/base'

export interface DeviceConfig {
    host: string
    port: number
    username: string
    password: string
    pullingTime: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
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
            id: 'port',
            label: 'Target Port',
            width: 4,
            default: 22,
            min: 1,
            max: 65535,
        },
        {
            type: 'textinput',
            id: 'username',
            label: 'Username',
            default: 'apc',
            width: 8,
        },
        {
            type: 'textinput',
            id: 'password',
            label: 'Password',
            width: 8,
        },
        {
            type: 'number',
            id: 'pullingTime',
            label: 'Set interval to pull data in msec',
            width: 8,
            min: 5000,
            max: 86400000,
            default: 60000,
        },
    ]
}

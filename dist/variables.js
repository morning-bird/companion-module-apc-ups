"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVariables = exports.initVariables = void 0;
const base_1 = require("@companion-module/base");
const initVariables = (instance) => {
    let variables = [];
    variables.push({ variableId: 'ups_type', name: 'UPS Type' });
    variables.push({ variableId: 'battery_capacity', name: 'Battery capacity' });
    variables.push({ variableId: 'battery_runtime_remain', name: 'Battery runtime remain' });
    instance.setVariableDefinitions(variables);
    let startValues = {};
    startValues['ups_type'] = '';
    startValues['battery_capacity'] = '';
    startValues['battery_runtime_remain'] = '';
    instance.setVariableValues(startValues);
};
exports.initVariables = initVariables;
const checkVariables = (instance) => {
    try {
        let variables = {};
        variables['ups_type'] = instance.APC_Data.ups_type;
        variables['battery_capacity'] = instance.APC_Data.battery_capacity;
        variables['battery_runtime_remain'] = instance.APC_Data.battery_runtime_remain;
        instance.setVariableValues(variables);
    }
    catch (error) {
        instance.updateStatus(base_1.InstanceStatus.UnknownWarning);
        instance.log('error', `Error checking variables: ${error.toString()}`);
    }
};
exports.checkVariables = checkVariables;
//# sourceMappingURL=variables.js.map
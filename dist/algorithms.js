"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlgorithmsObjectForSSH2 = exports.Ciphers = void 0;
exports.Ciphers = {
    AUTO: 0,
    AES256: 1,
    AES192: 2,
    AES128: 3,
};
const createAlgorithmsObjectForSSH2 = (config) => {
    let regex = undefined;
    switch (config.preferedCipher) {
        case exports.Ciphers.AUTO:
            return undefined;
        case exports.Ciphers.AES256:
            regex = new RegExp(/aes256/);
            break;
        case exports.Ciphers.AES192:
            regex = new RegExp(/aes192/);
            break;
        case exports.Ciphers.AES128:
            regex = new RegExp(/aes128/);
            break;
        default:
            break;
    }
    return {
        cipher: {
            prepend: regex,
        },
    };
};
exports.createAlgorithmsObjectForSSH2 = createAlgorithmsObjectForSSH2;
//# sourceMappingURL=algorithms.js.map
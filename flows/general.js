"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    fallback(conv) {
        if (conv.repromptCount > 3)
            return conv.next('general:quit');
        conv.say('Huh, what?').repeat();
    },
    noInput(conv) {
        conv.next('general:fallback');
    },
    quit(conv) {
        conv.track('exit', { flowIntent: `${conv.currentFlow}:${conv.currentIntent}` }).end();
    },
    transfer(conv) {
        conv.say('Hello from another device!');
    },
};
//# sourceMappingURL=general.js.map
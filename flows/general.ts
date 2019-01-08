import { Conversation } from 'kiai';

module.exports = {
  fallback(conv: Conversation) {
    if (conv.repromptCount > 3) return conv.next('general:quit');

    conv.say('Huh, what?').repeat();
  },

  noInput(conv: Conversation) {
    conv.next('general:fallback');
  },

  quit(conv: Conversation) {
    conv.track('exit', { flowIntent: `${conv.currentFlow}:${conv.currentIntent}` }).end();
  },
  
  transfer(conv: Conversation) {
    conv.say('Hello from another device!');
  },
};

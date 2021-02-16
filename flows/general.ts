import { Conversation } from 'kiai';

module.exports = {
  fallback(conv: Conversation) {
    if (conv.repromptCount > 3) return conv.next('general:quit');

    return conv.say('fallback_*').repeat();
  },

  noInput(conv: Conversation) {
    conv.next('general:fallback');
  },

  quit(conv: Conversation) {
    conv.track('exit', { flowIntent: `${conv.currentFlow}:${conv.currentIntent}` }).end();
  },
};

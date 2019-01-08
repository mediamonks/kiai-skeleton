import { Conversation } from 'kiai';

module.exports = {
  start(conv: Conversation) {
    conv.next(':welcome');
  },

  welcome(conv: Conversation) {
    conv
      // .play('SFX_Spin')
      // .show('logo')
      .say('welcome_*', )
      .confirm({ yes: ':welcome', no: ':end' });
  },

  end(conv: Conversation) {
    conv.say('Bye!').next('general:quit');
  },

  list(conv: Conversation) {
    conv.say("Here's a list!").list({
      title: 'This is a list',
      items: [
        {
          title: 'Item 1',
          description: 'This is item 1',
          image: 'https://www.catster.com/wp-content/uploads/2017/12/A-gray-kitten-meowing.jpg',
        },
        {
          title: 'Item 2',
          description: 'This is item 2',
          image:
            'https://kittenrescue.org/wp-content/uploads/2017/03/KittenRescue_KittenCareHandbook.jpg',
        },
      ],
    });
  },
};

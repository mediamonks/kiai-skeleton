import { Conversation } from 'kiai';

module.exports = {
  start(conv: Conversation) {
    // conv.login(':login', 'Please log in');
    conv.next(':welcome');
  },

  login(conv: Conversation, loginSuccessful) {
    if (loginSuccessful) {
      conv.say('Hello {name}!', { name: <string>conv.userProfile.name });
    } else {
      conv.say('Hello stranger.');
    }
    conv.next(':welcome');
  },

  welcome(conv: Conversation) {
    conv
      // .play('SFX_Spin')
      // .show('logo')
      .say('welcome_*')
      // .say('<par><media><audio src="https://freemusicarchive.org/file/music/no_curator/Monplaisir/Heat_of_the_Summer/Monplaisir_-_04_-_Stage_1_Level_24.mp3"></audio></media><media><speak>Would you like to see some kittens?</speak></media></par>')
      .show('https://media.giphy.com/media/jS6sVMK2fu4Uw/giphy.gif')
      // .say('Would you like to see some kittens?')
      .confirm({ yes: ':list', no: ':end' });
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
    conv.suggest('Item 1', 'Item 2');
  },

  end(conv: Conversation) {
    conv.say('Bye!').next('general:quit');
  },
};

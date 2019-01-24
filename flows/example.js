"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    start(conv) {
        conv.login(':login', 'Please log in');
    },
    login(conv, loginSuccessful) {
        if (loginSuccessful) {
            conv.say('Hello {name}!', { name: conv.userProfile.name });
        }
        else {
            conv.say('Hello stranger.');
        }
        conv.next(':welcome');
    },
    welcome(conv) {
        conv
            // .play('SFX_Spin')
            // .show('logo')
            .say('welcome_*')
            .say('Would you like to see some kittens?')
            .confirm({ yes: ':list', no: ':end' });
    },
    list(conv) {
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
                    image: 'https://kittenrescue.org/wp-content/uploads/2017/03/KittenRescue_KittenCareHandbook.jpg',
                },
            ],
        });
        conv.suggest('Item 1', 'Item 2');
    },
    end(conv) {
        conv.say('Bye!').next('general:quit');
    },
};
//# sourceMappingURL=example.js.map
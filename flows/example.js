"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    start(conv) {
        conv.next(':welcome');
    },
    welcome(conv) {
        conv
            // .play('SFX_Spin')
            // .show('logo')
            .say('welcome_*')
            .confirm({ yes: ':welcome', no: ':end' });
    },
    end(conv) {
        conv.say('Bye!').next('general:quit');
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
    },
};
//# sourceMappingURL=example.js.map
module.exports = {
  start(conv) {
    conv.next(':welcome');
  },

  welcome(conv) {
    conv
      .play('SFX_Spin')
      .show('logo')
      .say('welcome_*')
      .confirm({ yes: 'welcome', no: 'end' })
  },
  
  end(conv) {
    conv.say('Bye!').next('general:quit');
  }
};

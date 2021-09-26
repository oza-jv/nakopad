/**
 * なでしこ3 追加プラグイン 2021/9/26
 * file : plugin_speak.js
 * サイト用に「声出」を追加するだけ。
 */
const PluginSpeak = {
  '声出': {
    type: 'func',
    josi: [['と', 'を']],
    fn: function (text, sys) {
        speechSynthesis.cancel();

        // 話者の特定
        let voice = sys.__v0['話:話者'];
        if (!voice) { voice = sys.__exec('話者設定', ['ja', sys]) }

        const uttr = new SpeechSynthesisUtterance(text);
        
        uttr.voice = voice;
        if (voice) { uttr.lang = voice.lang }; // 必ず話者の特定に成功している訳ではない
        uttr.rate = sys.__v0['話者速度']
        uttr.pitch = sys.__v0['話者声高']
        uttr.volume = sys.__v0['話者音量']
        
        setTimeout(() => {
          speechSynthesis.speak(uttr);
        }, 500);
        //console.log("#声出: " + text);
    }
  },
  
  '声止': {
    type: 'func',
    josi: [[]],
    fn: function (text, sys) {
        speechSynthesis.cancel()
        //console.log("#声止: " + text);
    }
  }
}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginSpeak
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginSpeak', PluginSpeak)
}

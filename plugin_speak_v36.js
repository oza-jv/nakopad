/**
 * なでしこ3 追加プラグイン 2021/9/26
 *                      2024/8/27 v3.6に対応
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
        let voice = sys.__getSysVar('話:話者');
        if (!voice) { voice = sys.__exec('話者設定', ['ja', sys]) }

        const uttr = new SpeechSynthesisUtterance(text);
        
        uttr.voice = voice;
        if (voice) { uttr.lang = voice.lang }; // 必ず話者の特定に成功している訳ではない
        uttr.rate = sys.__getSysVar('話者速度');
        uttr.pitch = sys.__getSysVar('話者声高');
        uttr.volume = sys.__getSysVar('話者音量');
        
        setTimeout(() => {
          speechSynthesis.speak(uttr);
        }, 500);
    }
  },
  
  '声止': {
    type: 'func',
    josi: [[]],
    fn: function (text, sys) {
        speechSynthesis.cancel()
    }
  }
}

//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginSpeak', PluginSpeak)
} else {
  module.exports = PluginSpeak
}

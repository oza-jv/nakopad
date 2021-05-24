/**
 * なでしこ3 追加プラグイン 2021/3/15
 * file : plugin_speak.js
 * サイト用に「声出」を追加するだけ。
 */
const PluginSpeak = {
  '声出': {
    type: 'func',
    josi: [['と', 'を']],
    fn: function (text, sys) {
        speechSynthesis.cancel();
        const uttr = new SpeechSynthesisUtterance(text);
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

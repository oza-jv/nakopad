/**
 * なでしこ3 追加プラグイン 2021/4/11
 * file : plugin_hyouji.js
 * サイト用に「表示」と定数を追加するだけ。
 */
const PluginHyouji = {
  '表示': {
    type: 'func',
    josi: [['の', 'と', 'を']],
    fn: function (text, sys) {
      const parent = sys.__v0['DOM親要素']
      var te = document.createElement('span')
      te.innerHTML = text
      parent.appendChild(te)
      
      te = document.createElement('br');
      parent.appendChild(te);
    }
  },
  
  '自分IP取得': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      var ip = '';
      
      fetch( './api/ip.php', {method: 'GET'} )
      .then( res => {
        return res.text()
      }).then( text => {
        console.log( text );
        sys.__v0['対象'] = text;
        ip = text;
      });
      
      return ip;
    }
  },
  
  'クジラ': { type: 'const', value: './img/kujira.png' },
  'ライオン': { type: 'const', value: './img/lion.gif' },
  'ペンギン': { type: 'const', value: './img/penguin.gif' },
  '黒クジラ': { type: 'const', value: './img/kujira-bk.png' },
  'ピンポン': { type: 'const', value: './audio/se_maoudamashii_chime13.mp3' },
  'ブブー': { type: 'const', value: './audio/se_maoudamashii_onepoint32.mp3' },
  '発車ベル': { type: 'const', value: './audio/se_maoudamashii_jingle03.mp3' },
  '陽性者数API': { type: 'const', value: './api/get_pcr_positive_daily.php' }
}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginHyouji
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginHyouji', PluginHyouji)
}

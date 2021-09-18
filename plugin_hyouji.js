/**
 * なでしこ3 追加プラグイン 2021/9/11
 * file : plugin_hyouji.js
 * サイト用に「表示」と定数を追加するだけ。
 */
const PluginHyouji = {
  '表示': {
    type: 'func',
    josi: [['の', 'と', 'を'], ['で']],
    isVariableJosi: true,
    return_none: true,
    fn: function (text, ...pID) {
      const sys = pID.pop();
      let color = '';
      if( pID.length > 0 ) {
        // 色を指定する場合 2021/9/11追加
        color = pID[0];
      } else {
        color = '';
      }

      const parent = sys.__v0['DOM親要素']
      var te = document.createElement('span')
      te.innerHTML = text + '<br />';
      te.style.color = color;
      parent.appendChild(te)
      
      //te = document.createElement('br');
      //parent.appendChild(te);
    }
  },
  
  '無効化': {
    type: 'func',
    josi: ['を'],
    pure: true,
    fn: function (dom, s, v, sys) {
      if (typeof (dom) === 'string') { dom = document.querySelector(dom) }
      dom.disabled = true;
    },
    return_none: true
  },

  '有効化': {
    type: 'func',
    josi: ['を'],
    pure: true,
    fn: function (dom, s, v, sys) {
      if (typeof (dom) === 'string') { dom = document.querySelector(dom) }
      dom.disabled = false;
    },
    return_none: true
  },
  
  'クジラ': { type: 'const', value: './img/kujira.png' },
  'ライオン': { type: 'const', value: './img/lion.gif' },
  'ペンギン': { type: 'const', value: './img/penguin.gif' },
  '黒クジラ': { type: 'const', value: './img/kujira-bk.png' },
  'ピンポン': { type: 'const', value: './audio/se_maoudamashii_chime13.mp3' },
  'ブブー': { type: 'const', value: './audio/se_maoudamashii_onepoint32.mp3' },
  '発車ベル': { type: 'const', value: './audio/se_maoudamashii_jingle03.mp3' },
  '陽性者数API': { type: 'const', value: './api/get_pcr_positive_daily.php' },
  '自分IP取得': { type: 'const', value: './api/ip.php' },		// 2021.6.12追加
  'チャットサーバ': { type: 'const', value: 'wss://a0tklsq8jk.execute-api.ap-northeast-1.amazonaws.com/test' }		// 2021.9.11追加
}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginHyouji
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginHyouji', PluginHyouji)
}

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
  
  '表出力': { // @二次元配列をTABLEに変換して表示する。
    type: 'func',
    josi: [['を'],['で']],
    isVariableJosi: true,
    pure: true,
    fn: function (a, ...pID) {
      const sys = pID.pop();
      if (!(a instanceof Array)) { throw new Error('『表列数』には配列を指定する必要があります。') }

      let border = 0;
      let color = 'gray';

      // 線の太さを取得する
      if(  pID.length > 0 ) {
        if( !isNaN(pID[0]) ) border = Number(pID[0]);
      }

      // 行数取得
      let rows = a.length;
      
      // 列数取得
      let cols = 1
      for (let i = 0; i < rows; i++) {
        if (a[i].length > cols) { cols = a[i].length }
      }

      // Elementの準備
      const parent = sys.__v0['DOM親要素']
      var te = document.createElement('table');

      // 表を生成
      var data = [];
      for( i=0; i<rows; i++ ) {
        data.push( te.insertRow(-1) );  // 行を追加

        for( let j=0; j<cols; j++ ) {
          var cell = data[i].insertCell(-1);

          if( j >= a[i].length ) {
            cell.appendChild( document.createTextNode('') );
          } else {
            cell.appendChild( document.createTextNode(a[i][j]) );
          }
          cell.style.border = `${border}px solid ${color}`;

        }
      }

      // 表を出力
      te.id = 'nadesi-dom-' + sys.__v0['DOM生成個数']
      parent.appendChild(te);
      sys.__v0['DOM生成個数']++;
      return te;
    }
  },
  
  '表セル': { // @表出力で生成したTABLEのセル(td)にDOMスタイル設定するときに使う関数
    type: 'func',
    josi: ['の'],
    pure: true,
    fn: function (te, sys) {
      if( te.nodeName !== 'TABLE' ) {
         throw new Error('『表セル』にはTABLEを指定する必要があります。') 
      }
      
      return `#${te.id} td`;
    }
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
  'NPWSサーバ': { type: 'const', value: 'wss://a0tklsq8jk.execute-api.ap-northeast-1.amazonaws.com/prod' }		// 2021.9.20追加
}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginHyouji
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginHyouji', PluginHyouji)
}

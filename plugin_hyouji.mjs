/**
 * なでしこ3 追加プラグイン v1.0 2021/9/11
 *                        v2.0 2024/8/27 v3.6に対応
 *                        v3.0 2025/11/16 mjs形式に変更
 * file : plugin_hyouji.mjs
 * サイト用に「表示」と定数を追加するだけ。
 */
const PluginHyouji = {
  'meta': {
    type: 'const',
    value: {
      pluginName: 'PluginHyouji', // プラグインの名前
      description: '表示関連命令と定数の追加',
      pluginVersion: '3.0.0', // プラグインのバージョン
      nakoRuntime: ['wnako'], // 対象ランタイム
      nakoVersion: '3.7.0' // 最小要求なでしこバージョン
    }
  },

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

      const parent = sys.__getSysVar('DOM親要素');
      var te = document.createElement('span');
      te.innerHTML = text + '<br />';
      te.style.color = color;
      parent.appendChild(te);
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
  
  '表出力': { // @二次元配列をTABLEに変換して表示する。 (#id)へ(配列)を(太さ)で
    type: 'func',
    josi: [['を'],['で'],['へ', 'に']],
    isVariableJosi: true,
    pure: true,
    fn: function (a, ...pID) {
      const sys = pID.pop();
      if (!(a instanceof Array)) { throw new Error('『表出力』には配列を指定する必要があります。') }

      // Elementの準備
      const parent = sys.__getSysVar('DOM親要素');
      var te = document.createElement('table');

      let border = 0;
      let color = 'gray';
      let el = null;

      // 可変長引数の処理
      if(  pID.length > 0 ) {
        // 線の太さを取得する pID[0]
        if( !isNaN(pID[0]) ) border = Number(pID[0]);
        
        // 要素を指定した場合は，表を差し替える pID[1]
        if( pID[1] ) {
          el = pID[1];
          if (typeof el === 'string') { el = document.querySelector('#' + el) }
          if ( !el ) {
            throw new Error('指定したElementが存在しません。') 
          }
          if ( el.nodeName !== 'TABLE' ) {
            throw new Error('『表出力』にはTABLEを指定する必要があります。') 
          }
        }
      }

      // 行数取得
      let rows = a.length;
      
      // 列数取得
      let cols = 1
      for (let i = 0; i < rows; i++) {
        if (a[i].length > cols) { cols = a[i].length }
      }

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
      if( !el ) {
        te.id = 'nadesi-dom-' + sys.__getSysVar('DOM生成個数')
        parent.appendChild( te );
        sys.setSysVar( 'DOM生成個数', sys.__getSysVar('DOM生成個数') + 1 );
      } else {
        te.id = el.id;
        parent.replaceChild( te, el );
      }
      return te.id;
    }
  },
  
  '表セル': { // @表出力で生成したTABLEのセル(td)にDOMスタイル設定するときに使う関数
    type: 'func',
    josi: ['の'],
    pure: true,
    fn: function (el, sys) {
     if (typeof el === 'string') { el = document.querySelector('#' + el) }
     if ( !el ) {
       throw new Error('指定したElementが存在しません。') 
     }
     if( el.nodeName !== 'TABLE' ) {
         throw new Error('『表セル』にはTABLEを指定する必要があります。') 
      }
      return `#${el.id} td`;
    }
  },
  
  '引数確認': {
    type: 'func',
    josi: [['を'],['で'],['に']],
    isVariableJosi: true,
    pure: true,
    fn: function (a, ...pID) {
      const sys = pID.pop();
      
      if( pID.length > 0 ) {
        console.log( `pID.length: ${pID.length}` );
        for( let i = 0; i < pID.length; i++ ) {
          console.log( `pID[${i}] = ${pID[i]} typeof: ${typeof(pID[i])}` );
        }
      }
    }    
  },
  
  'クジラ': { type: 'const', value: './img/kujira.png' },
  'ライオン': { type: 'const', value: './img/lion.gif' },
  'ペンギン': { type: 'const', value: './img/penguin.gif' },
  '黒クジラ': { type: 'const', value: './img/kujira-bk.png' },
  'ピンポン': { type: 'const', value: './audio/se_maoudamashii_chime13.mp3' },
  'ブブー':   { type: 'const', value: './audio/se_maoudamashii_onepoint32.mp3' },
  '発車ベル': { type: 'const', value: './audio/se_maoudamashii_jingle03.mp3' },
  'ポコ':     { type: 'const', value: './audio/poka.mp3' },
  '効果音1' : { type: 'const', value: './audio/se_maoudamashii_system49.mp3' },
  '効果音2' : { type: 'const', value: './audio/se_maoudamashii_system05.mp3' },
  '効果音3' : { type: 'const', value: './audio/se_maoudamashii_system10.mp3' },
  '効果音4' : { type: 'const', value: './audio/se_maoudamashii_system23.mp3' },
  '効果音5' : { type: 'const', value: './audio/se_maoudamashii_system25.mp3' },
  '効果音6' : { type: 'const', value: './audio/se_maoudamashii_system27.mp3' },
  '効果音7' : { type: 'const', value: './audio/se_maoudamashii_system28.mp3' },
  '効果音8' : { type: 'const', value: './audio/se_maoudamashii_system29.mp3' },
  '効果音9' : { type: 'const', value: './audio/se_maoudamashii_system38.mp3' },
  '効果音10': { type: 'const', value: './audio/se_maoudamashii_system39.mp3' },
  '効果音11': { type: 'const', value: './audio/se_maoudamashii_system41.mp3' },
  '効果音12': { type: 'const', value: './audio/se_maoudamashii_system43.mp3' },
  '効果音13': { type: 'const', value: './audio/se_maoudamashii_system46.mp3' },
  '効果音14': { type: 'const', value: './audio/se_maoudamashii_system47.mp3' },
  '冷蔵庫閉1': { type: 'const', value: './img/refrigerator-close1.png' },
  '冷蔵庫開1': { type: 'const', value: './img/refrigerator-open1.png' },
  '冷蔵庫開2': { type: 'const', value: './img/refrigerator-open2.png' },
  '車間1': { type: 'const', value: './img/distance-far.png' },
  '車間2': { type: 'const', value: './img/distance-close.png' },
  '車間3': { type: 'const', value: './img/distance-veryclose.png' },
  '陽性者数API': { type: 'const', value: './api/get_pcr_positive_daily.php' },
  'NPWSサーバ': { type: 'const', value: 'wss://a0tklsq8jk.execute-api.ap-northeast-1.amazonaws.com/prod' },		// 2021.9.20追加
  'チャットサーバ': { type: 'const', value: 'wss://a0tklsq8jk.execute-api.ap-northeast-1.amazonaws.com/prod' },		// 2021.9.20追加
  '翻訳API': { type: 'const', value: 'https://3u3vc7vfz1.execute-api.ap-northeast-1.amazonaws.com/dev/translate' },		// 2021.9.26追加
  '白箱': { type: 'const', value: './img/white.png' },  // 2024.9.6追加

  // WS関連
  'WS未接続': { // 2022.11.3 WS接続されていなければ「はい(1)」を，接続済なら「いいえ(0)」を返す。 2024.9.6修正
    type: 'func',
    josi: [],
    pure: true,
    fn: function (sys) {
      const ws = sys.__getSysVar('WS:SOCKET');
      if( !ws ) {
        // その他は，コネクションが綴じられている
        console.log( 'WS未接続: ' + 1);
        return 1;
      } else {
        if( ws.readyState == 1 ) {
          // 1:OPEN コネクションが開かれ、通信の準備ができている
          console.log( 'WS未接続: ' + 0);
          return 0;
        } else {
          return 1;
        }
      }
    }
  }
}

//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginHyouji', PluginHyouji)
} else {
  export default PluginHyouji
}


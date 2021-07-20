/**
 * なでしこ3 追加プラグイン 2020/12/19  v1.2
 *                          2021/ 3/20  v1.3 audioタグ関係を修正
 *                          2021/ 3/20  v1.4 助詞の追加
 *                          2021/ 7/16  v1.5 非同期モードでのWAITを追加
 * file : plugin_media.js
 * 音声，静止画，動画を表示・再生するためのプラグイン
 * ローカルのファイルも扱える
 * 文字を「書く」命令もある
 * 
 */

const WAIT_SEC_md = 0.4;    // 処理を待機する秒数

const PluginMedia = {
  // --- 画像関係 ---
  '絵追加': { // @img要素を追加して，aPicファイルを読み込む。 //@エツイカ
    // pIDを指定するとそれを親要素とする。省略するとdefault親要素の子要素として追加。
    // 生成されたid名を返す。
    type: 'func',
    josi: [['の', 'を'],['へ', 'に']],
    isVariableJosi: true,
    return_none: false,
    fn: function (aPic, ...pID) {
      try {
        const sys = pID.pop();
        var parent = sys.__v0['DOM親要素'];
        if ( pID.length > 0 ) {
          parent = document.querySelector("#" + pID[0]);
        };
        const img = document.createElement('img');
        img.src = aPic;
        img.id = 'nadesi-dom-' + sys.__v0['DOM生成個数'];
        parent.appendChild(img);
        sys.__v0['DOM生成個数']++;

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
        
        return img.id;
     } catch(e) {
        // エラーを表示
        window.alert('絵追加 ' + e.message);
        return -1;
     }
    }
  },

  '絵読込': { // @id=aIDの画像をaPicに差し替える // @エヨミコミ
    type: 'func',
    josi: [['に'],['を']],
    return_none: true,
    fn: function (aID, aPic, sys) {
      try {
        const parent = document.querySelector("#" + aID);
        parent.src = aPic;

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('絵読込 ' + e.message);
        return -1;
      }
    }
  },
  
  // --- 音関係 ---
  '音読込': { // @id=aIDのaudio要素にaSrcファイルを読み込む // @オトヨミコミ
    // あらかじめaudio要素を設置しておく場合はこっち。
    type: 'func',
    josi: [['に'],['を']],
    return_none: true,
    fn: function (aID, aSrc, sys) {
      try {
        const audio = document.querySelector("#" + aID);
        audio.src = aSrc;
      } catch(e) {
        // エラーを表示
        window.alert('音読込 ' + e.message);
        return -1;
      }
    }
  },
  
  '音追加': { // @audio要素を追加して，aSrcファイルを読み込む // @オトツイカ
    // aIDを指定するとそれを親要素とする。省略するとbodyの子要素として追加。
    //                            21.3.20 省略するとdefault親要素の子要素として追加 に変更
    // 生成されたid名を返します。
    type: 'func',
    josi: [['の', 'を'],['へ', 'に']],
    isVariableJosi: true,
    return_none: false,
    fn: function (aSrc, ...pID) {
      try {
        const sys = pID.pop();
        // var parent = document.body;
        var parent = sys.__v0['DOM親要素'];
        if ( pID.length > 0 ) {
          parent = document.querySelector("#" + pID[0]);
        };
        const audio = document.createElement('audio');
        audio.src = aSrc;
        audio.classList.add('media');
        audio.id = 'nadesi-dom-' + sys.__v0['DOM生成個数'];
        parent.appendChild(audio);
        sys.__v0['DOM生成個数']++;
        return audio.id;
     } catch(e) {
        // エラーを表示
        window.alert('音追加 ' + e.message);
        return -1;
     }
    }
  },
    
  '音再生': { // @id=aIDのaudio要素に設定されている音を頭から再生する // @オトサイセイ
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      try {
        const audio = document.querySelector("#" + aID);
        audio.currentTime = 0;
        audio.play();

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('音再生 ' + e.message);
        return -1;
      }
    }
  },

  '音再開': { // @id=aIDのaudio要素に設定されている音を停止位置から再生する // @オトサイカイ
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      try {
        const audio = document.querySelector("#" + aID);
        audio.play();

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('音再開 ' + e.message);
        return -1;
      }
    }
  },

  '音停止': { // @id=aIDのaudio要素に設定されている音を一時停止する // @オトテイシ
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      try {
        const audio = document.querySelector("#" + aID);
        audio.pause();

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md* 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('音停止 ' + e.message);
        return -1;
      }
    }
  },
  
  // --- 動画関係 ---
  '動画読込': { // @id=aIDのvideo要素にaSrcファイルを読み込む // @ドウガヨミコミ
    // あらかじめvideo要素を設置しておく場合はこっち。
    type: 'func',
    josi: [['に'],['を']],
    return_none: true,
    fn: function (aID, aSrc, sys) {
      try {
        const video = document.querySelector("#" + aID);
        video.playsinline = true;
        video.muted = true;    // chromeではmutedがtrueでないと再生できない
        video.src = aSrc;

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('動画読込 ' + e.message);
        return -1;
      }
    }
  },

  '動画追加': { // @video要素を追加して，aSrcファイルを読み込む // @ドウガツイカ
    // aIDを指定するとそれを親要素とする。省略するとdefault親要素の子要素として追加。
    // 生成されたid名を返す。
    type: 'func',
    josi: [['の', 'を'],['へ', 'に']],
    isVariableJosi: true,
    return_none: false,
    fn: function (aSrc, ...pID) {
      try {
        const sys = pID.pop();
        var parent = sys.__v0['DOM親要素'];
        if ( pID.length > 0 ) {
          parent = document.querySelector("#" + pID[0]);
        };
        const video = document.createElement('video');
        video.src = aSrc;
        video.classList.add('media');
        video.id = 'nadesi-dom-' + sys.__v0['DOM生成個数'];
        video.width = '320';
        video.controls = false;
        video.playsinline = true;
        video.muted = true;     // chromeではmutedがtrueでないと再生できない
        parent.appendChild(video);
        sys.__v0['DOM生成個数']++;

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }

        return video.id;
     } catch(e) {
        // エラーを表示
        window.alert('動画追加 ' + e.message);
        return -1;
     }
    }
  },

  '動画再生': { // @id=aIDのvideo要素に設定されている動画を頭から再生する // @ドウガサイセイ
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      try {
        const video = document.querySelector("#" + aID);
        video.currentTime = 0;
        video.play();

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('動画再生 ' + e.message);
        return -1;
      }
    }
  },
  
  '動画停止': { // @id=aIDのvideo要素に設定されている動画を一時停止する // @ドウガテイシ
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      try {
        const video = document.querySelector("#" + aID);
        video.pause();

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('動画停止 ' + e.message);
        return -1;
      }
    }
  },

  '動画再開': { // @id=aIDのvideo要素に設定されている動画を停止位置から再生する // @ドウガサイカイ
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      try {
        const video = document.querySelector("#" + aID);
        video.play();

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
      } catch(e) {
        // エラーを表示
        window.alert('動画再開 ' + e.message);
        return -1;
      }
    }
  },
  
  '動画音オン': {
    type: 'func',
    josi: [['の', 'を']],
    return_none: true,
    fn: function (aID, sys) {
      const video = document.querySelector("#" + aID);
      video.muted = false;

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
    }
  },

  '動画音オフ': {
    type: 'func',
    josi: [['の']],
    return_none: true,
    fn: function (aID, sys) {
      const video = document.querySelector("#" + aID);
      video.muted = true;

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
    }
  },

   
  // --- 文字関係 ---
  '書': {
    type: 'func',
    josi: [['と', 'を']],
    return_none: true,
    fn: function (text, sys) {
      const parent = sys.__v0['DOM親要素']
      var te = document.createElement('span')
      te.innerHTML = text
      parent.appendChild(te)
      
      te = document.createElement('br');
      parent.appendChild(te);

        // 2021.7.16 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }
    }
  }
}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginMedia
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginMedia', PluginMedia)
}

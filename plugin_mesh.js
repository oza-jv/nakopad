/**
 * mesh実装
 * (SkyWayを利用したWebRTC)
 */

const PluginMesh = {
//  '対話ID': { type: 'var', value: '' },

  '対話サーバ開始': {
    type: 'func',
    josi: [],
    isVariableJosi: false,
    return_none: false,
    fn: function (sys) {
      try {
        //Peer作成 実行する度に新規IDが発行されるので注意。
        const peer = new Peer({
          key: '97492634-9dd7-45be-83bf-9b4efc6cd4f4',
          debug: 3
        });

        // 非同期モードでのWAITを追加
        if (sys.__genMode == '非同期モード') {
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC_md * 1000);
        }

        return peer;

      }  catch(e) {
        // エラーを表示
        throw new Error('対話サーバ開始 ' + e.message);
        return -1;
      }
    }
  },

  '対話ID': {
    type: 'func',
    josi: [['の']],
    isVariableJosi: false,
    return_none: false,
    fn: function (peer, sys) {
      if( !peer.open ) return;
      return peer.id;
    }
  },
  
  '対話サーバ切断': {
    type: 'func',
    josi: [['の','を']],
    isVariableJosi: false,
    return_none: true,
    fn: function (peer, sys) {
      if( !peer.open ) return;
      try {
          peer.destroy();
      }  catch(e) {
        // エラーを表示
        throw new Error('対話サーバ切断 ' + e.message);
        return -1;
      }
    }
  },

  '対話接続': {
    type: 'func',
    josi: [['で'], ['と']],
    isVariableJosi: false,
    return_none: false,
    fn: function (peer, remortId, sys) {
      try {
        // サーバとコネクトする
        const dataConnection = peer.connect(remortId);
        
        // イベントの登録
        dataConnection.once('open', async () => {
          sys.__exec('表示', ['接続完了', sys]);
        });
        dataConnection.on('data', data => {
          sys.__exec('表示', [data, sys]);
        });
        dataConnection.once('close', () => {
          sys.__exec('表示', ['接続終了', sys]);
        });

        return peer;

      }  catch(e) {
        // エラーを表示
        throw new Error('対話サーバ接続 ' + e.message);
        return -1;
      }
    }
  }

}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginMesh;
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginMesh', PluginMesh);
}

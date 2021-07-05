/**
 * なでしこ3 追加プラグイン 2021/7/5  Ver1.01
 * file : plugin_nakoboard.js
 * Chromeブラウザでなでしこボードを使うためのプラグイン。
 * なでしこv3.2.23以降の「!非同期モード」で実行するほうが正しく動作します。
 */

// 変数定義
let outputReportId = 0;
let device;
let ADval = 0;
let USBconnected = 0;  // 処理可＝1，不可＝０
let outputReport = new Uint8Array(64);
const WAIT_SEC = 0.3;    // 処理を待機する秒数

/*---------------------------------------------
   なでしこボード用の関数群
  ---------------------------------------------*/
const filters = [
  {
    // なでしこボードのHIDフィルタ
    vendorId: 0x3289,
    productId: 0x2001
  }
];

// 接続状態の確認
let ChkHIDItem = function () {
  if (!device)  {
    USBconnected = -1;      // 未接続
  } else if( device.opened ) {
    USBconnected = 1;      // 接続＆オープン完了
  } else {
    USBconnected = 0;      // 接続したが未オープン
  }
  return USBconnected;
};


/*---------------------------------------------
   WebHID用の関数群
  ---------------------------------------------*/
// 接続時のイベント
navigator.hid.addEventListener('connect', ({device}) => {
  console.log(`HID connected: ${device.productName}`);
  ChkHIDItem();
});

//切断時のイベント
navigator.hid.addEventListener('disconnect', ({device}) => {
  console.log(`HID disconnected: ${device.productName}`);

  device.removeEventListener("inputreport", handleInputReport);
  device.close();
  ChkHIDItem();
});

// デバッグ用
function chkReportID(device) {
  for (let collection of device.collections) {
    // A HID collection includes usage, usage page, reports, and subcollections.
    console.log(`Usage: ${collection.usage}`);
    console.log(`Usage page: ${collection.usagePage}`);

    for (let inputReport of collection.inputReports) {
      console.log(`Input report: ${inputReport.reportId}`);
      // Loop through inputReport.items
    }

    for (let outputReport of collection.outputReports) {
      console.log(`Output report: ${outputReport.reportId}`);
      // Loop through outputReport.items
    }

    for (let featureReport of collection.featureReports) {
      console.log(`Feature report: ${featureReport.reportId}`);
      // Loop through featureReport.items
    }
  }
}

// ボード側から受信したときのイベント
let handleInputReport = (event) => {
  const { data, device, reportId } = event;
  if( (device.productId !== filters[0].productId) || (reportId !== 0) ) return;
  
  //console.log(event.device.productName + ": got input report " + reportId);
  //console.log(new Uint8Array(data.buffer));
  
  // 測定値
  ADval = data.getUint8(2);
  ADval = (ADval << 8) | data.getUint8(1);
  console.log(`sensor: ${ADval}` );
}

// n秒間待機
function sleep(msec) {
  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
  var startMsec = new Date();
  while (new Date() - startMsec < msec);
}

// センサ１測定用の関数
let WaitForInputReport;    // 「ボード接続」内で定義


/*---------------------------------------------
   なでしこプラグインでの命令追加
  ---------------------------------------------*/
const PluginNakoBoard = {
  'ボード接続': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      // HID APIを使えるか
      if(!("hid" in navigator)) {
          console.log('HID NG');
          return;
      } else {
          console.log('HID OK');
      };

      // すでに開いているか
      if( ChkHIDItem() == 1 ) return;

      if (sys.__genMode != '非同期モード') {
        // 非同期モードに対応していない時の処理
        throw new Error('ボード接続は「!非同期モード」で使ってください');
      } else {
        sys.async = true;

        // 接続を要求
        (async () => {
          await navigator.hid.getDevices()
          .then( async (devices) => {
            if( devices.length == 0 ) {
              // 接続されていないときは，接続する
              [device] = await navigator.hid.requestDevice({ filters });
              if (!device) return;

              // 接続できました
              console.log(`User selected "${device.productName}" HID device.`);
            } else {
              // すでに接続されているとき
              device = devices[0];
              console.log(`User previously selected "${device.productName}" HID device.`);
            }
          });
          // デバイスをオープンする
          await device.open()
          .then( () => {
            console.log(`${device.productName} opened: ${device.opened}`);
            console.log( device );

            // ボードから入力したときのイベント定義
            device.addEventListener("inputreport", handleInputReport);
            WaitForInputReport = () => new Promise(resolve => device.addEventListener("inputreport", resolve));

            //chkReportID(device);
            ChkHIDItem();

            // 接続したことを表示
            nako3_print("なでしこボードを接続しました。");
          });
        })().catch( e => console.log(e) );

        // ちょっと待つことで正常に動作させる。
        try {
          // ちょっと待つことで正常に動作させる。
          if (sys.__genMode == '非同期モード') {
            sys.async = true;
            setTimeout(() => {
              sys.nextAsync(sys)
            }, WAIT_SEC * 1000)
          } else {
            sys.__exec('秒逐次待機', [WAIT_SEC, sys]);
          }
        } catch(e) {
          console.log(e);
        }
      }
    }
  },
  
  'ボード切断': {
    type: 'func',
    josi: [],
    fn: function (text, sys) {
      if (!device) return;
      if( ChkHIDItem() < 1 ) return;

      device.close();
      console.log(`${device.productName} opened: ${device.opened}`);
    }
  },
  
  'ボード状態': { // @利用可＝１，未オープン＝０，未接続＝－１
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      return USBconnected;
    }
  },

  'ボード未接続': {  // @未接続・未オープンならばはい（１）を，それ以外はいいえ（０）を返す
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        return 0;
      } else {
        return 1;
      }
    }
  },

  '秒発音': {  // @なでしこボードのブザーを鳴らす。nをs秒発音。 // @ハツオン
    type: 'func',
    josi: [[''], ['を']],
    isVariableJosi: true,
    return_none: true,
    fn: function (sec, ...pID) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
          let note = 15;
          
          // 引数チェック
          const sys = pID.pop();
          if( pID.length > 0 ) {
            // 音の高さ(note)チェック
            let text = pID[0];
          note = Number( text );
          if( isNaN(note) ) note = 15;
          if( note < 0  ) note = 0;
          if( note > 23 ) note = 23;
        } else {
          note = 15;
        }

        if( sec < 0 ) sec = 0;
        if( sec > 2 ) sec = 2;  // 最大２秒にする

        // beep
        const beep_turnon = () => {
          outputReport[0] = 'P'.charCodeAt(0);
          outputReport[1] = note;
        };
        const beep_turnoff = () => {
          outputReport[0] = 'P'.charCodeAt(0);
          outputReport[1] = 23;
        };

        beep_turnon();
        device.sendReport(outputReportId, outputReport);
        sleep(sec*1000);

        beep_turnoff();
        device.sendReport(outputReportId, outputReport);
      }
    }
  },
  
  '発音': { // @ (note)を0.5秒発音する。単に「発音」とすればnote=15で発音。
    type: 'func',
    josi: [['を']],
    isVariableJosi: true,
    return_none: true,
    fn: function (...pID) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
          let text = 15;

          // 引数チェック
          const sys = pID.pop();
          if( pID.length > 0 )  text = pID[0];
          
          // 「noteを0.5秒発音」と同じ意味にする
          sys.__exec( '秒発音', [0.5, text, sys] );
      }
    }
  },

  'LEDオン': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // turn on
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = 0;
        outputReport[2] = 1;
        device.sendReport(outputReportId, outputReport);
        console.log("led on");
      }
    }
  },

  'LEDオフ': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // turn off
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = 0;
        outputReport[2] = 0;
        device.sendReport(outputReportId, outputReport);
        console.log("led off");
      }
    }
  },

  '出力1オン': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // turn on
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = 1;
        outputReport[2] = 1;
        device.sendReport(outputReportId, outputReport);
        console.log("output1 turn on");
      }
    }
  },

  '出力1オフ': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // turn off
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = 1;
        outputReport[2] = 0;
        device.sendReport(outputReportId, outputReport);
        console.log("output1 turn off");
      }
    }
  },

  '出力2オン': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // turn on
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = 2;
        outputReport[2] = 1;
        device.sendReport(outputReportId, outputReport);
        console.log("output2 turn on");
      }
    }
  },

  '出力2オフ': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // turn off
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = 2;
        outputReport[2] = 0;
        device.sendReport(outputReportId, outputReport);
        console.log("output2 turn off");
      }
    }
  },

  '出力オン': {
    type: 'func',
    josi: [['の','を']],
    fn: function (port, sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // 引数チェック
        if( port < 1 ) return 0;
        if( port > 7 ) return 0;
      
        // turn on
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = port;
        outputReport[2] = 1;
        device.sendReport(outputReportId, outputReport);
        console.log(`output${port} turn on`);
      }
      return 1;
    }
  },

  '出力オフ': {
    type: 'func',
    josi: [['の','を']],
    fn: function (port, sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // 引数チェック
        if( port < 1 ) return 0;
        if( port > 7 ) return 0;
      
        // turn off
        outputReport[0] = 'O'.charCodeAt(0);
        outputReport[1] = port;
        outputReport[2] = 0;
        device.sendReport(outputReportId, outputReport);
        console.log(`output${port} turn off`);
      }
    }
  },

  'B4オン': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オン', [4,sys]);
    }
  },

  'B4オフ': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オフ', [4,sys]);
    }
  },

  'B5オン': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オン', [5,sys]);
    }
  },

  'B5オフ': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オフ', [5,sys]);
    }
  },

  'B6オン': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オン', [6,sys]);
    }
  },

  'B6オフ': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オフ', [6,sys]);
    }
  },

  'B7オン': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オン', [7,sys]);
    }
  },

  'B7オフ': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      sys.__exec('出力オフ', [7,sys]);
    }
  },

  'Bセット': {
    type: 'func',
    josi: [['で','を']],
    fn: function (str, sys) {
      // 引数チェック
      let s = (str + '0000').slice(0, 4);    // ４文字にする
      let st = 0;
      
      ChkHIDItem();
      if( USBconnected == 1 ) {
        // ビット列生成
        if( s.charAt(0) != '0' ) st |= 0x80;
        if( s.charAt(1) != '0' ) st |= 0x40;
        if( s.charAt(2) != '0' ) st |= 0x20;
        if( s.charAt(3) != '0' ) st |= 0x10;
      
        outputReport[0] = 'E'.charCodeAt(0);
        outputReport[1] = st;
        outputReport[2] = 0;
        device.sendReport(outputReportId, outputReport);
        console.log(`bitset ${s}(${st})`);
      }
      return st;
    }
  },

  'センサ1': { type: 'var', value: 0 },
  'センサ2': { type: 'var', value: 0 },
  'センサ3': { type: 'var', value: 0 },

  'センサ1測定': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      if (sys.__genMode != '非同期モード') {
        // 非同期モードに対応していない時の処理
        throw new Error('センサ1測定は「!非同期モード」で使ってください')
      } else {
        sys.async = true;

        ChkHIDItem();
        if( USBconnected == 1 ) {
          async function WaitForInput() {
            try {
              outputReport[0] = 'A'.charCodeAt(0);
              await device.sendReport(outputReportId, outputReport)
              await WaitForInputReport();
              sys.__v0['センサ1'] = ADval;
              sys.__v0['それ'] = ADval;
              //console.log( `センサ1測定: ${ADval}` );
            } catch(e) {
              console.log(e);
            }
          }
          WaitForInput();

          // ちょっと待つことで正常に動作させる。
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC * 1000);
        }
      }
    }
  },

  'センサ2測定': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      if (sys.__genMode != '非同期モード') {
        // 非同期モードに対応していない時の処理
        throw new Error('センサ2測定は「!非同期モード」で使ってください')
      } else {
        sys.async = true;

        ChkHIDItem();
        if( USBconnected == 1 ) {
          async function WaitForInput() {
            try {
              outputReport[0] = 'a'.charCodeAt(0);
              await device.sendReport(outputReportId, outputReport)
              await WaitForInputReport();
              sys.__v0['センサ2'] = ADval;
              sys.__v0['それ'] = ADval;
              //console.log( `センサ2測定: ${ADval}` );
            } catch(e) {
              console.log(e);
            }
          }
          WaitForInput();

          // ちょっと待つことで正常に動作させる。
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC * 1000);
        }
      }
    }
  },

  'センサ3測定': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) { 
      if (sys.__genMode != '非同期モード') {
        // 非同期モードに対応していない時の処理
        throw new Error('センサ3測定は「!非同期モード」で使ってください')
      } else {
        sys.async = true;

        ChkHIDItem();
        if( USBconnected == 1 ) {
          async function WaitForInput() {
            try {
              outputReport[0] = 'z'.charCodeAt(0);
              await device.sendReport(outputReportId, outputReport)
              await WaitForInputReport();
              sys.__v0['センサ3'] = ADval;
              sys.__v0['それ'] = ADval;
              //console.log( `センサ3測定: ${ADval}` );
            } catch(e) {
              console.log(e);
            }
          }
          WaitForInput();

          // ちょっと待つことで正常に動作させる。
          sys.async = true;
          setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC * 1000);
        }
      }
    }
  },
 
  'ボード待': {
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
        try {
          // ちょっと待つことで正常に動作させる。
          if (sys.__genMode == '非同期モード') {
           sys.async = true;
           setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC * 1000);
          } else {
            sys.__exec('秒逐次待機', [WAIT_SEC, sys])
          }
        } catch(e) {
          console.log(e);
        }
      }
    }
  },

  '🚉': {  // @ エキ
    type: 'func',
    josi: [],
    return_none: true,
    fn: function (sys) {
      ChkHIDItem();
      if( USBconnected == 1 ) {
          try {
            // ちょっと待つことで正常に動作させる。
            if (sys.__genMode == '非同期モード') {
             sys.async = true;
             setTimeout(() => { sys.nextAsync(sys); }, WAIT_SEC * 1000);
            } else {
              sys.__exec('秒逐次待機', [WAIT_SEC, sys])
            }
          } catch(e) {
            console.log(e);
          }
      }
    }
  },
  
  '!クリア': {
    type: 'func',
    josi: [],
    pure: false,
    return_none: true,
    fn: function (sys) {
      //ボード側の出力を全てオフに
      sys.__exec('出力1オフ', [sys]);
      sys.__exec('出力2オフ', [sys]);
      sys.__exec('Bセット', ['0000', sys]);

      // ストックされている命令を停止
      if (sys.__genMode == '非同期モード') { sys.__stopAsync(sys); }
    }
  }

}

// モジュールのエクスポート(必ず必要)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginNakoBoard
}
//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('PluginNakoBoard', PluginNakoBoard)
}

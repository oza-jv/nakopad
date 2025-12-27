/**
 * なでしこ3 追加プラグイン 2025/12/27   Ver.1
 * file : plugin_microbit.js
 * Chromeブラウザでmicro:bitを使うためのプラグイン。
 */

// シリアルポートの管理変数
let port;
let writer;
let reader;
let keepReading = false;
let readerClosedPromise; // 読み込みループが完全に終わるのを待つためのPromise
let writableStreamClosed;

// センサー値・コールバック保持用
let latestAcc = { x: 0, y: 0, z: 0 };
let onButtonA_Callback = null;
let onButtonB_Callback = null;

// ▼▼▼ アイコンの日本語名とIDの対応表 ▼▼▼
const MICROBIT_ICONS = {
  // --- 感情・顔 ---
  'ハート': 0,
  '小さいハート': 1,
  'はい': 2, 'チェック': 2,
  'いいえ': 3, 'バツ': 3,
  '嬉しい': 4, 'スマイル': 4,
  '悲しい': 5,
  '困る': 6,
  '怒る': 7,
  '寝る': 8,
  '驚く': 9,
  '変顔': 10,
  'すごい': 11,
  '普通': 12,
  
  // --- 服・動物・物 ---
  'Tシャツ': 13,
  'ローラー': 14,
  'アヒル': 15,
  '家': 16,
  'カメ': 17,
  'チョウ': 18,
  '棒人間': 19,
  'お化け': 20,
  '剣': 21,
  'キリン': 22,
  'ドクロ': 23,
  '傘': 24,
  'ヘビ': 25,
  'ウサギ': 26,
  'ウシ': 27,
  
  // --- 記号・図形 ---
  '二分音符': 28,
  '四分音符': 29,
  '八分音符': 30,
  'フォーク': 31,
  'ターゲット': 32,
  '三角': 33,
  '左三角': 34,
  '市松模様': 35,
  'ダイヤ': 36,
  '小さいダイヤ': 37,
  '四角': 38,
  '小さい四角': 39,
  'ハサミ': 40
};

// ▼▼▼ 矢印の方向とIDの対応表 ▼▼▼
const MICROBIT_ARROWS = {
  // 方角
  '北': 0, 'N': 0,
  '北東': 1, 'NE': 1,
  '東': 2, 'E': 2,
  '南東': 3, 'SE': 3,
  '南': 4, 'S': 4,
  '南西': 5, 'SW': 5,
  '西': 6, 'W': 6,
  '北西': 7, 'NW': 7,

  // 直感的な言葉（授業で使いやすいように）
  '上': 0,
  '右上': 1,
  '右': 2,
  '右下': 3,
  '下': 4,
  '左下': 5,
  '左': 6,
  '左上': 7
};

/*---------------------------------------------
   micro:bit用の関数群
  ---------------------------------------------*/

// --- 4. 読み込みループ ---
async function readLoop() {
  // 【修正1】ポートが既にロックされていたら、この2回目のループは即座に終了させる
  if (port.readable.locked) {
    console.log("readLoopが重複して呼ばれましたが、スキップしました。");
    return;
  }

  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  try {
    let buffer = "";
    while (keepReading) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += value;
        // 改行で区切ってデータを処理
        const lines = buffer.split("\n");
        buffer = lines.pop(); // 最後の不完全なデータはバッファに戻す
        
        for (const line of lines) {
          parseData(line.trim());
        }
        console.log(value);
      }
    }
  } catch (error) {
    console.error("読み込みエラー", error);
  } finally {
    if (reader) {
      console.log("Readerロックを解放します");
      reader.releaseLock();
    }
  }
}

// --- 1. 接続関数（再接続ガード付き） ---
async function connectSerial() {
  // portが存在しても、閉じている(readableがnull)なら再接続を許可する
  if (port && port.readable) {
    console.log("既に接続されています");
    return true;
  }
  
  // 以前の接続が中途半端に残っている場合は、正規の手順で切断する
  if (port) {
    await disconnectSerial();
  }

  try {
    const filters = [
      { usbVendorId: 0x0d28 } // micro:bit (mbed) のVendor ID 
    ];
    
    // フィルタを適用してダイアログを表示
    port = await navigator.serial.requestPort({ filters });
    await port.open({ baudRate: 115200 });

    // 書き込みストリームの準備
    const textEncoder = new TextEncoderStream();
    const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    // 読み込みループの開始
    keepReading = true;
    readerClosedPromise = readLoop(); 

    // バッファクリア等の初期化
    if (typeof clearBuffer === "function") clearBuffer();

    // 接続したことを表示
    nako3_print("micro:bitを接続しました。もう一度プログラムを実行してください。");

    console.log("micro:bit-USB接続成功");
    return true;

  } catch (e) {
    // 失敗したら変数をリセットして、次回の再試行を可能にする
    port = null; 
    writer = null;
    console.error("micro:bit-接続エラー:", e);
		nako3_print("==ERROR==" + e.message + "\n micro:bitのケーブルを一度抜いてから,再接続してください。")
    return false;
  }
}

// --- 2. 切断関数（新規追加） ---
async function disconnectSerial() {
  console.log("切断処理を開始します...");
  keepReading = false;
  
try {
    // 1. Reader（読み込み）の強制終了
    if (reader) {
      // 読み込みをキャンセル。エラーが出ても無視して進む
      await reader.cancel().catch(() => {});
      // ループが完全に終わるのを待つ
      if (readerClosedPromise) {
        await readerClosedPromise.catch(() => {});
      }
      reader = null;
    }
    
    // 2. Writer（書き込み）の強制終了
    if (writer) {
      await writer.close().catch(e => console.log("Writer close error:", e));
      writer = null;
    }
    // パイプ（pipeTo）が完全に流れ終わるのを待つ
    if (writableStreamClosed) {
      await writableStreamClosed.catch(() => {});
      writableStreamClosed = null;
    }

    // 3. Port（ポート本体）を閉じる
    if (port) {
      await port.close().catch(e => console.log("Port close error:", e));
      port = null;
      console.log("Micro:bit disconnected (Port closed)");    
    }

    // 切断したことを表示
    nako3_print("micro:bitを切断しました。一度ケーブルを抜いてから再接続してください。");

  } catch (e) {
    console.error("切断中にエラーが発生しましたが、強制リセットします:", e);
		nako3_print("==ERROR==" + e.message + "")
    // 強制リセット
    port = null;
    writer = null;
    reader = null;
  }
}

// --- 3. バッファ・状態クリア関数（新規追加） ---
function clearBuffer() {
  latestAcc = { x: 0, y: 0, z: 0 };
  onButtonA_Callback = null; // ボタンイベントの登録解除
  onButtonB_Callback = null;
  console.log("micro:bit-バッファと状態をクリアしました");
}

// --- 5. データ解析関数
function parseData(data) {
  // イベント信号を受信した場合
  if (data === "EVENT:A") {
    // 登録された関数があれば実行する
    if (onButtonA_Callback) {
      // なでしこの関数を実行（sysを渡す必要がある場合がありますが、単純実行で動く場合が多いです）
      // 非同期関数の可能性もあるので await しても良いですが、ここでは単純呼び出し
      onButtonA_Callback(); 
    }
  }
  else if (data === "EVENT:B") {
    if (onButtonB_Callback) onButtonB_Callback();
  }

  // "ACC: -120, 30, 1024" のようなデータを解析
  else if (data.startsWith("ACC:")) {
    const parts = data.substring(4).split(",");
    if (parts.length === 3) {
      latestAcc.x = parseInt(parts[0]);
      latestAcc.y = parseInt(parts[1]);
      latestAcc.z = parseInt(parts[2]);
    }
  }
}

// --- 6. データを送信する関数
async function sendSerial(text) {
  if (!writer) return;
  // micro:bitのシリアル読み込みは改行(\n)を区切りとすることが多いため付与
  try {
    await writer.write(text + "\n");
    console.log("送信:", text);
  } catch (e) {
    console.error("送信エラー:", e);
  }
}

// 音関連
// --- 1. すべての音を停止する ---
async function microbitStopSound() {
  await sendSerial("SOUND:STOP");
}

// --- 2. 内蔵メロディを鳴らす ---
// コマンド例: "MELODY:DADADADUM"
// 引数 name には "DADADADUM", "ENTERTAINER", "PRELUDE" などを指定
async function microbitPlayMelody(name) {
  await sendSerial("MELODY:" + name);
}

// -- 3. 音を1拍鳴らす ---
// コマンド例: "TONE:262:500" (周波数Hz:ミリ秒)
// 引数 noteFreq: 周波数 (ド=262, レ=294, ミ=330 ...)
// 引数 duration: 長さ(ミリ秒) 1拍なら通常500〜1000くらい
async function microbitPlayTone(noteFreq, duration) {
  // デフォルトで1拍=500msとします（引数がなければ）
  if (!duration) duration = 500; 
  await sendSerial("TONE:" + noteFreq + ":" + duration);
  await new Promise(resolve => setTimeout(resolve, duration + 100));
}


/*---------------------------------------------
   なでしこプラグインでの命令追加
  ---------------------------------------------*/
// --- なでしこプラグイン定義 ---
const microbitUsbPlugin = {
  'meta': {
    type: 'const',
    value: {
      pluginName: 'microbitUsbPlugin', // プラグインの名前
      description: 'micro:bitを制御する命令群',
      pluginVersion: '1.0.0', // プラグインのバージョン
      nakoRuntime: ['wnako'], // 対象ランタイム
      nakoVersion: '3.6.0' // 最小要求なでしこバージョン
    }
  },

  // 接続機能
  'マイクロビットUSB接続': { 
    type: 'func',
    josi: [],
    fn: async function (sys) {
      // 以前のconnectSerial関数を呼び出す
      if( !writer ) {
        return await connectSerial(); 
      }
    }
  },

  'マイクロビット切断': {
    type: 'func',
    josi: [],
    fn: async function (sys) {
      await disconnectSerial();
    }
  },
  
  'マイクロビットバッファクリア': { // 名前は「初期化」などでもOK
    type: 'func',
    josi: [],
    fn: function (sys) {
      clearBuffer();
    }
  },

  // 生のコマンドを送る機能（上級者用）
  'マイクロビットUSB送信': {
    type: 'func',
    josi: [['を', 'と']], 
    fn: async function (text, sys) {
      return await sendSerial(text);
    }
  },

// センサー送信を開始させる命令
  'マイクロビットセンサ開始': {
    type: 'func',
    josi: [],
    fn: async function (sys) {
      await sendSerial("START");
    }
  },

  // センサー送信を停止させる命令
  'マイクロビットセンサ停止': {
    type: 'func',
    josi: [],
    fn: async function (sys) {
      await sendSerial("STOP");
    }
  },

  // ■ 接続状態を確認する命令（接続されていたら True を返す）
  'マイクロビット接続中': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      // writer変数が存在し、かつロックされていないか簡易チェック
      return (writer !== undefined && writer !== null);
    }
  },

  // ■ 未接続を確認する命令（接続されていなければ True を返す）
  'マイクロビット未接続': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      // 接続中の「逆」を返す
      return !(writer !== undefined && writer !== null);
    }
  },

  // --- ここから下が、授業で使いやすくするための命令 ---
  
  'マイクロビットハート表示': {
    type: 'func',
    josi: [],
    fn: async function (sys) { await sendSerial("HEART"); }
  },

  'マイクロビットスマイル表示': {
    type: 'func',
    josi: [],
    fn: async function (sys) { await sendSerial("SMILE"); }
  },

  'マイクロビットノー表示': {
    type: 'func',
    josi: [],
    fn: async function (sys) { await sendSerial("NO"); }
  },

  'マイクロビットアイコン表示': {
    type: 'func',
    josi: [['を', 'の']], // 「ハートを...」
    fn: function (name, sys) {
      // 1. 対応表からIDを探す
      let id = MICROBIT_ICONS[name];
      
      // 2. もし見つからなければ、そのまま送るかエラーにする
      // (数字を直接指定したい場合への対応)
      if (id === undefined) {
          if (!isNaN(name)) { id = name; } // 数字ならそのまま使う
          else { console.error("知らないアイコンです:" + name); return; }
      }
      
      // 3. コマンドを作成して送信 (例: "ICON:0")
      sendSerial("ICON:" + id);
    }
  },

  'マイクロビット矢印表示': {
    type: 'func',
    josi: [['を', 'の']], // 「北を...」
    fn: function (name, sys) {
      // 1. 対応表からIDを探す
      let id = MICROBIT_ARROWS[name];
      
      // 2. 数字が直接指定された場合の対応
      if (id === undefined) {
          if (!isNaN(name)) { id = name; }
          else { console.error("知らない方向です:" + name); return; }
      }
      
      // 3. 送信 (例: "ARROW:0")
      sendSerial("ARROW:" + id);
    }
  },

  'マイクロビット表示消': {
    type: 'func',
    josi: [],
    fn: async function (sys) { await sendSerial("CLEAR"); }
  },
  
  'マイクロビット文字表示': {
    type: 'func',
    josi: [['を', 'と']],
    fn: async function (text, sys) { 
      // MSG:〜 の形式に変換して送る
      await sendSerial("MSG:" + text); 
    }
  },
  
  'マイクロビット端子出力': {
    type: 'func',
    josi: [['を'], ['の']], // 「1を P0の マイクロビット端子出力」
    fn: async function (val, pinName, sys) {
      // P0, P1, P2などの文字列を受け取り、コマンドを作る
      // 例: pinName="P0", val=1 -> "P0:1"
      let cmd = pinName + ":" + val;
      await sendSerial(cmd);
    }
  },

  'マイクロビット加速度X': {
    type: 'func',
    josi: [],
    fn: function (sys) { return latestAcc.x; }
  },
  'マイクロビット加速度Y': {
    type: 'func',
    josi: [],
    fn: function (sys) { return latestAcc.y; }
  },
  'マイクロビット加速度Z': {
    type: 'func',
    josi: [],
    fn: function (sys) { return latestAcc.z; }
  },

  // イベント登録用の命令
  'マイクロビットAボタン押時': {
    type: 'func',
    josi: [['を', 'には', 'は', '行う', '実行する']],
    fn: function (func, sys) {
      // 引数として渡された「処理ブロック(関数)」を変数に保存
      onButtonA_Callback = function() {
          // なでしこ3の関数実行の作法（sysを渡して実行）
          func(sys); 
      };
    },
    return_none: true
  },
  
  'マイクロビットBボタン押時': {
    type: 'func',
    josi: [['を', 'には', 'は', '行う', '実行する']],
    fn: function (func, sys) {
      onButtonB_Callback = function() { func(sys); };
    },
    return_none: true
  },

  // 4. 音・音楽関連
  'マイクロビット音停止': {
    type: 'func',
    josi: [],
    fn: async function (sys) {
      await microbitStopSound();
    }
  },

  'マイクロビットメロディ再生': {
    type: 'func',
    josi: [['を', 'の']], // 「"DADADADUM"を マイクロビットメロディ再生」
    fn: async function (name, sys) {
      await microbitPlayMelody(name);
    }
  },

  'マイクロビット発音': { // 音を0.5秒鳴らす
    type: 'func',
    josi: [['を']], // 「262を マイクロビット発音」
    fn: async function (freq, sys) {
      // durationはオプション引数として扱いたいが、なでしこ側の呼び出し方による
      // 基本形：「周波数」をマイクロビット音鳴
      await microbitPlayTone(freq, 500);
    }
  },
  
  '秒マイクロビット発音': { // 長さを指定して鳴らす
    type: 'func',
    josi: [['を'], ['']], // 「262を 1秒マイクロビット発音」
    fn: async function (freq, sec, sys) {
      await microbitPlayTone(freq, sec*1000);
    }
  }

};

//プラグインの自動登録
if (typeof (navigator) === 'object') {
  navigator.nako3.addPluginObject('MicrobitUsbPlugin', microbitUsbPlugin)
} else {
  module.exports =microbitUsbPlugin;
}

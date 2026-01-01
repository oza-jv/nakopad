/**
 * なでしこ3 追加プラグイン 2025/12/27   Ver.1
 * file : plugin_microbit.js
 * Chromeブラウザでmicro:bitを使うためのプラグイン。
 */

// 通信状態管理
let connectType = "NONE"; // "USB", "BLE", "NONE"
let isMicrobitConnected = false;

// USB用変数
let port, writer, reader;

// シリアルポートの管理変数
let keepReading = false;
let readerClosedPromise; // 読み込みループが完全に終わるのを待つためのPromise
let writableStreamClosed;

// センサー値・状態保持用 ★★★
let sensorData = { 
  x: 0, y: 0, z: 0, 
  btnA: 0, btnB: 0, 
  light: 0, temp: 0,
  p0: 0, p1: 0, p2: 0,
  logo: 0 
};

// コールバック関数保持用
let onButtonA_Callback = null;
let onButtonB_Callback = null;
let onButtonAB_Callback = null;
// ★タッチイベント用コールバック
let onLogoTouched_Callback = null;
let onLogoPressed_Callback = null;
let onLogoReleased_Callback = null;
let onLogoLong_Callback = null;
// ★追加：ジェスチャー用コールバック
let onShake_Callback = null;      // 振った
let onScreenUp_Callback = null;   // 画面上
let onScreenDown_Callback = null; // 画面下
let onTiltLeft_Callback = null;   // 左傾き
let onTiltRight_Callback = null;  // 右傾き

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
  '驚く': 9, 'びっくり': 9,
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

// ▼▼▼ メロディ定義（MakeCodeの配列の順番と合わせる） ▼▼▼
// 値の形式: "タイプ:ID"  (S=Sound, M=Melody)
const MICROBIT_MELODIES = {
  // --- V2用サウンド (S) ---
  'くすくす笑う': 'S:0',
  'ハッピー': 'S:1',
  'ハロー': 'S:2',
  'ミステリアス': 'S:3',
  '悲しい': 'S:4',
  'するする動く': 'S:5',
  '舞い上がる': 'S:6',
  'バネ': 'S:7',
  'キラキラ': 'S:8',
  'あくび': 'S:9',

  // --- メロディ (M) ---
  'ダダダム': 'M:0',
  'ジ・エンターテイナー': 'M:1',
  'プレリュード': 'M:2',
  '歓喜の歌': 'M:3',
  'ニャン・キャット': 'M:4',
  '着信メロディ': 'M:5',
  'ファンク': 'M:6',
  'ブルース': 'M:7',
  'ハッピーバースデー': 'M:8',
  'ウエディングマーチ': 'M:9',
  'おそうしき': 'M:10',
  'ちゃんちゃん♪': 'M:11',
  'タッタラッタッター': 'M:12',
  'チェイス': 'M:13',
  'ピコーン！': 'M:14',
  'ワワワワー': 'M:15',
  'ジャンプアップ': 'M:16',
  'ジャンプダウン': 'M:17',
  'パワーアップ': 'M:18',
  'パワーダウン': 'M:19'
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

// --- 接続関数（再接続ガード付き） ---
async function connectSerial() {
  // ★修正: 接続フラグとwriterの両方をチェック
  if (isMicrobitConnected && writer) {
    console.log("接続中です");
    return true;
  }

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
    const filters = [ { usbVendorId: 0x0d28 } ] // micro:bit (mbed) のVendor ID ];
   
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

    connectType = "USB";
    isMicrobitConnected = true;

    // 接続したことを表示
    if (typeof nako3_print === "function") nako3_print("micro:bitを接続しました。もう一度プログラムを実行してください。");
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

// --- 切断関数 ---
async function disconnectSerial() {
  console.log("USB切断処理を開始します...");
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
  
  isMicrobitConnected = false;  // 切断時にフラグをOFF
  connectType = "NONE";
  clearBuffer();
}

// --- 切断関数（共通化） ---
//async function disconnectAll() {
//  disconnectSerial();
//  connectType = "NONE";
//  clearBuffer();
//}

// --- 初期化 ---
function clearBuffer() {
  sensorData = { x: 0, y: 0, z: 0, btnA: 0, btnB: 0, light: 0, temp: 0, p0: 0, p1: 0, p2: 0 };
  onButtonA_Callback = null;  // ボタン用コールバックの初期化
  onButtonB_Callback = null;
  onShake_Callback = null;    // ジェスチャー用コールバックの初期化
  onScreenUp_Callback = null;
  onScreenDown_Callback = null;
  onTiltLeft_Callback = null;
  onTiltRight_Callback = null;
  console.log("micro:bit-バッファと状態をクリアしました");
}

// --- データ解析関数
function parseData(data) {
  if (data.startsWith("EV:")) console.log("Event:"+ data + "\n");

  // イベント信号
  if (data === "EV:A") { if (onButtonA_Callback) onButtonA_Callback(); }
  else if (data === "EV:B") { if (onButtonB_Callback) onButtonB_Callback(); }
  else if (data === "EV:AB") { if (onButtonAB_Callback) onButtonAB_Callback(); }
  else if (data === "EV:T") { if (onLogoTouched_Callback) onLogoTouched_Callback(); }
  else if (data === "EV:P") { if (onLogoPressed_Callback) onLogoPressed_Callback(); }
  else if (data === "EV:R") { if (onLogoReleased_Callback) onLogoReleased_Callback(); }
  else if (data === "EV:L") { if (onLogoLong_Callback) onLogoLong_Callback(); }
  else if (data.startsWith("EV:1")) { if (onScreenUp_Callback) onScreenUp_Callback(); }
  else if (data.startsWith("EV:2")) { if (onScreenDown_Callback) onScreenDown_Callback(); }
  else if (data.startsWith("EV:3")) { if (onTiltLeft_Callback) onTiltLeft_Callback(); }
  else if (data.startsWith("EV:4")) { if (onTiltRight_Callback) onTiltRight_Callback(); }
  else if (data.startsWith("EV:5")) { if (onShake_Callback) onShake_Callback(); }

  // センサーデータ (DAT:ax,ay,az,ba,bb,li,te,p0,p1,p2)
  // 順序: accX, accY, accZ, btnA, btnB, light, temp, p0, p1, p2, lo
  else if (data.startsWith("DAT:")) {
    const parts = data.substring(4).split(",");
    if (parts.length >= 11) {
      sensorData.x = parseInt(parts[0]);
      sensorData.y = parseInt(parts[1]);
      sensorData.z = parseInt(parts[2]);
      sensorData.btnA = parseInt(parts[3]);
      sensorData.btnB = parseInt(parts[4]);
      sensorData.light = parseInt(parts[5]);
      sensorData.temp = parseInt(parts[6]);
      sensorData.p0 = parseInt(parts[7]);
      sensorData.p1 = parseInt(parts[8]);
      sensorData.p2 = parseInt(parts[9]);
      sensorData.logo = parseInt(parts[10]);
    }
  }
}

// --- データを送信する関数
async function sendSerial(text) {
  if (!writer) return;
  // micro:bitのシリアル読み込みは改行(\n)を区切りとすることが多いため付与
  try {
    await writer.write(text + "\n"); 
  } catch (e) { console.error(e); }
}

// --- 音関連のヘルパー関数 ---
// --- 1. すべての音を停止する ---
async function microbitStopSound() {
  await sendSerial("SOUND:STOP");
}

// --- 2. 内蔵メロディを鳴らす ---
async function microbitPlayMelody(name) {
// 1. まず辞書にあるか探す
  let n = String(name).trim();
  let id = MICROBIT_MELODIES[n];
  // 2. なければ（辞書にない or 既にIDが渡された）、そのまま使う
  if (!id) id = name; 
  // 3. 送信
  await sendSerial("MELODY:" + id);
}

// -- 3. 音を1拍鳴らす ---
// コマンド例: "TONE:262:500" (周波数Hz:ミリ秒)
// 引数 noteFreq: 周波数 (ド=262, レ=294, ミ=330 ...)
// 引数 duration: 長さ(ミリ秒) 1拍なら通常500〜1000くらい
async function microbitPlayTone(noteFreq, duration) {
  // デフォルトで1拍=500msとします（引数がなければ）
  if (!duration) duration = 500; 
  await sendSerial("TONE:" + noteFreq + ":" + duration);
  await new Promise(resolve => setTimeout(resolve, duration + 200));
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
      if( !writer ) {
        return await connectSerial(); 
      } else {
        console.log("既に接続中");
      }
    }
  },

  'マイクロビット切断': {
    type: 'func', 
    josi: [], 
    fn: async function (sys) { 
      await disconnectAll(); 
    } 
  },
  
  'マイクロビットバッファクリア': { // 名前は「初期化」などでもOK
    type: 'func',
    josi: [],
    fn: function (sys) {
      clearBuffer();
    }
  },

  'マイクロビット停止': {
    type: 'func',
    josi: [],
    fn: async function (sys) {
      await sendSerial("STOP");
    }
  },

  // 生のコマンドを送る機能（上級者用）
  'マイクロビット送信': {
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
      await sendSerial("SENSORSTOP");
    }
  },

  'マイクロビット接続中': { type: 'func', josi: [], fn: function (sys) { return isMicrobitConnected; } },
  'マイクロビット未接続': { type: 'func', josi: [], fn: function (sys) { return !isMicrobitConnected; } },
  
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

  'マイクロビットLED表示': {
    type: 'func',
    josi: [['を']], 
    fn: async function (pattern, sys) {
      // 1. 入力を強制的に文字列にする（念のため）
      let s = String(pattern);
      
      // 2. 全角の「０」「１」を半角に直す（日本語入力対策）
      s = s.replace(/０/g, '0').replace(/１/g, '1');

      // 3. 半角の「0」と「1」以外をすべて削除する
      // これにより、改行(Enter)、スペース、タブなどが全て消えて繋がります
      let cleanPattern = s.replace(/[^01]/g, "");

      // ★デバッグ用: ブラウザのコンソールに変換結果を表示
      // 「F12」キーを押してConsoleを見ると、ここで何文字になったか分かります
      console.log("LED変換前:", pattern);
      console.log("LED変換後:", cleanPattern, "文字数:", cleanPattern.length);

      // 4. 文字数チェック
      if (cleanPattern.length !== 25) {
        let msg = "LEDのエラー: 0と1の数が " + cleanPattern.length + " 個です。25個必要です。";
        console.error(msg);
        // なでしこ側にもメッセージを出す（可能なら）
        if (sys && sys.__print) sys.__print(msg);
        return;
      }

      // 5. 送信
      await sendSerial("LED:" + cleanPattern);
    }
  },
  // --- 点灯・消灯 ---
  'マイクロビット点灯': {
    type: 'func',
    josi: [['と'], ['を', 'の']], 
    fn: async function (x, y, sys) {
      // 念のため半角数字に変換してから送る
      // (parseFloatを通すことで、全角数字や文字列もきれいな数値になります)
      let nx = parseFloat(x);
      let ny = parseFloat(y);
      
      // 数値じゃなかったらエラー
      if (isNaN(nx) || isNaN(ny)) {
          console.error("点灯エラー: 座標は数字で指定してください", x, y);
          return;
      }
      
      await sendSerial("PLOT:" + nx + ":" + ny);
    }
  },

  'マイクロビット消灯': {
    type: 'func',
    josi: [['と'], ['を', 'の']],
    fn: async function (x, y, sys) {
      // こちらも同様に変換
      let nx = parseFloat(x);
      let ny = parseFloat(y);
      
      if (isNaN(nx) || isNaN(ny)) {
          console.error("消灯エラー: 座標は数字で指定してください", x, y);
          return;
      }

      await sendSerial("UNPLOT:" + nx + ":" + ny);
    }
  },

  // --- センサー（入力） ---
  // 既存の加速度も sensorData を見るように変更
  'マイクロビット加速度X': { type: 'func', josi: [], fn: function (sys) { return sensorData.x; } },
  'マイクロビット加速度Y': { type: 'func', josi: [], fn: function (sys) { return sensorData.y; } },
  'マイクロビット加速度Z': { type: 'func', josi: [], fn: function (sys) { return sensorData.z; } },

  'マイクロビット照度': {
    type: 'func', josi: [], 
    fn: function (sys) { return sensorData.light; }
  },
  
  'マイクロビット温度': {
    type: 'func', josi: [], 
    fn: function (sys) { return sensorData.temp; }
  },
  
  'マイクロビットAボタン状態': {
    type: 'func', josi: [], 
    fn: function (sys) { return (sensorData.btnA === 1); } // True/Falseを返す
  },
  
  'マイクロビットBボタン状態': {
    type: 'func', josi: [], 
    fn: function (sys) { return (sensorData.btnB === 1); }
  },

  'マイクロビットロゴ状態': { 
    type: 'func', 
    josi: [], 
    fn: function (sys) { 
      return (sensorData.logo === 1); 
    } 
  },

  // --- 端子（入出力） ---
  // 入力モードにする（＝読み取りON、出力OFF）
  'マイクロビット端子入力モード設定': { 
    type: 'func', 
    josi: [['を', 'の']], // 「P0を...」
    fn: async function (pinName, sys) {
      // CONFIG:P0:1 を送る
      await sendSerial("CONFIG:" + pinName + ":1");
    }
  },
  // 出力モードにする（＝読み取りOFF、出力ON）
  'マイクロビット端子出力モード設定': { 
    type: 'func', 
    josi: [['を', 'の']], 
    fn: async function (pinName, sys) {
      // CONFIG:P0:0 を送る
      await sendSerial("CONFIG:" + pinName + ":0");
    }
  },
  // デジタル入力（読み取り）
  'マイクロビット端子デジタル入力': { // 「P0の マイクロビット端子デジタル入力」
    type: 'func', josi: [['の']], 
    fn: function (pinName, sys) {
      if (pinName == "P0") return sensorData.p0;
      if (pinName == "P1") return sensorData.p1;
      if (pinName == "P2") return sensorData.p2;
      return 0;
    }
  },

  // アナログ出力（書き込み）
  'マイクロビット端子アナログ出力': { // 「1023を P0へ マイクロビット端子アナログ出力」
    type: 'func', josi: [['を'], ['へ', 'に']], 
    fn: async function (val, pinName, sys) {
      // ANALOG:P0:1023 形式で送信
      await sendSerial("ANALOG:" + pinName + ":" + val);
    }
  },
  // --- サーボモーター ---
  'マイクロビットサーボ出力': { 
    type: 'func', 
    josi: [['を'], ['へ', 'に', 'の']], // 「90を P0へ...」
    fn: async function (angle, pinName, sys) {
      // 角度は0〜180の範囲
      await sendSerial("SERVO:" + pinName + ":" + angle);
    }
  },

  // ボタンを押した時のイベント
  'マイクロビットAボタン押時': {
    type: 'func',
    josi: [['を', 'には', 'は', '行う', '実行する']],
    fn: function (func, sys) {
      // 引数として渡された「処理ブロック(関数)」を変数に保存
      onButtonA_Callback = function() { func(sys); };
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
  'マイクロビットABボタン押時': { 
    type: 'func', 
    josi: [['を', 'には', 'は', '行う', '実行する']], 
    fn: function (f, s) { 
      onButtonAB_Callback = function() { f(s); }; 
    }, 
    return_none: true 
  },

  //  'マイクロビットロゴタッチ時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onLogoTouched_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビットロゴ押時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onLogoPressed_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビットロゴ離時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onLogoReleased_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビットロゴ長押時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onLogoLong_Callback = function() { f(s); }; }, return_none: true },

  // ★追加：加速度イベント
  'マイクロビット振時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onShake_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビット画面上時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onScreenUp_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビット画面下時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onScreenDown_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビット左傾時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onTiltLeft_Callback = function() { f(s); }; }, return_none: true },
  'マイクロビット右傾時': { type: 'func', josi: [['を', 'には', 'は', '行う', '実行する']], fn: function (f, s) { onTiltRight_Callback = function() { f(s); }; }, return_none: true },

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
    josi: [['を', 'の']], 
    fn: async function (n, sys) {
      await microbitPlayMelody(n); 
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

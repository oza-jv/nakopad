// micro:bit for nakopad v1.1  2026/1/1
// このソースコードをmakecodeからmicro:bitに書きこむ　→なでしこパッドからプログラムを送る

// --- 初期設定 ---
// USBシリアル設定
serial.redirect(SerialPin.USB_TX, SerialPin.USB_RX, BaudRate.BaudRate115200)
serial.setRxBufferSize(128)

// 音の設定
music.setBuiltInSpeakerEnabled(true)
music.setVolume(127)

// ★★★ 重要な変更点: 命令を溜めておく「待ち行列（キュー）」を作る ★★★
let commandQueue: string[] = []

// 送信許可フラグ
let isSending = false

// ★★★ 端子の読み取り許可フラグ (初期値は全部ON) ★★★
let enableReadP0 = true
let enableReadP1 = true
let enableReadP2 = true

// --- ★追加：曲と効果音のリスト（順番が重要！）---
// V2用サウンドのリスト
const soundList = [
    soundExpression.giggle,     // 0
    soundExpression.happy,      // 1
    soundExpression.hello,      // 2
    soundExpression.mysterious, // 3
    soundExpression.sad,        // 4
    soundExpression.slide,      // 5
    soundExpression.soaring,    // 6
    soundExpression.spring,     // 7
    soundExpression.twinkle,    // 8
    soundExpression.yawn        // 9
]

// メロディのリスト
const melodyList = [
    Melodies.Dadadadum,   // 0
    Melodies.Entertainer, // 1
    Melodies.Prelude,     // 2
    Melodies.Ode,         // 3
    Melodies.Nyan,        // 4
    Melodies.Ringtone,    // 5
    Melodies.Funk,        // 6
    Melodies.Blues,       // 7
    Melodies.Birthday,    // 8
    Melodies.Wedding,     // 9
    Melodies.Funeral,     // 10
    Melodies.Punchline,   // 11
    Melodies.Baddy,       // 12
    Melodies.Chase,       // 13
    Melodies.BaDing,      // 14
    Melodies.Wawawawaa,   // 15
    Melodies.JumpUp,      // 16
    Melodies.JumpDown,    // 17
    Melodies.PowerUp,     // 18
    Melodies.PowerDown    // 19
]

// イベント送信用の関数（安全装置付き）
let now = 0;
let lastEventTime = 0;
function sendEvent(eventName: string) {
    let now = input.runningTime()
    // 前回のイベントから500ms以上経っていないと送らない（チャタリング防止）
    if (now - lastEventTime > 500) {
        // ★重要変更：writeStringではなくwriteLineを使う（確実に区切る）
        serial.writeLine(eventName)
        lastEventTime = now
    }
}
// --- ★追加：タッチセンサ（ロゴ）のイベント ---
// 1. 押した (Pressed): しっかり押した（クリックした）感じ
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    sendEvent("EV:P")
    basic.pause(10) // 送信待ち
})
// 2. 離した (Released)
input.onLogoEvent(TouchButtonEvent.Released, function () {
    sendEvent("EV:R")
    basic.pause(10) // 送信待ち
})
// 3. 長押し (LongPressed)
input.onLogoEvent(TouchButtonEvent.LongPressed, function () {
    sendEvent("EV:L")
    basic.pause(10) // 送信待ち
})

// --- ボタンイベント ---
input.onButtonPressed(Button.AB, function () {
    sendEvent("EV:AB")
    basic.pause(10)
})
input.onButtonPressed(Button.A, function () {
    sendEvent("EV:A")
    basic.pause(10)
})
input.onButtonPressed(Button.B, function () {
    sendEvent("EV:B")
    basic.pause(10)
})

// --- ジェスチャーイベント ---
input.onGesture(Gesture.Shake, function () {
    sendEvent("EV:5")
    basic.pause(10)
})
input.onGesture(Gesture.TiltRight, function () {
    sendEvent("EV:4")
    basic.pause(10)
})
input.onGesture(Gesture.TiltLeft, function () {
    sendEvent("EV:3")
    basic.pause(10)
})
input.onGesture(Gesture.ScreenDown, function () {
    sendEvent("EV:2")
    basic.pause(10)
})
input.onGesture(Gesture.ScreenUp, function () {
    sendEvent("EV:1")
    basic.pause(10)
})


function processCommand(command: string) {
    // 制御コマンド
    if (command == "START") {
        // ★重要：再接続されたら、古い待ち行列を空にする
        commandQueue = []
        isSending = true
        basic.clearScreen()
    }
    else if (command == "STOP") {   // 全て停止
        isSending = false
        basic.clearScreen()
        music.stopAllSounds()
        commandQueue = []
        enableReadP0 = false
        enableReadP1 = false
        enableReadP2 = false
        pins.analogWritePin(AnalogPin.P0, 0)
        pins.analogWritePin(AnalogPin.P1, 0)
        pins.analogWritePin(AnalogPin.P2, 0)
        pins.servoWritePin(AnalogPin.P0, 0)
        pins.servoWritePin(AnalogPin.P0, 0)
        pins.servoWritePin(AnalogPin.P0, 0)
    }
    else if (command == "SENSORSTOP") {  // センサ停止
        isSending = false
    }
    // ★★★ 追加：端子設定コマンド (CONFIG:Pin:Mode) ★★★
    // 例: CONFIG:P0:0 (P0の読み取りをオフ=出力モードにする)
    // 例: CONFIG:P0:1 (P0の読み取りをオン=入力モードにする)
    else if (command.includes("CONFIG:")) {
        let parts = command.split(":")
        let pinName = parts[1]
        let mode = (parts[2] == "1") // "1"ならtrue, "0"ならfalse

        if (pinName == "P0") enableReadP0 = mode
        else if (pinName == "P1") enableReadP1 = mode
        else if (pinName == "P2") enableReadP2 = mode
    }
    // 音停止
    else if (command == "SOUND:STOP") {
        music.stopAllSounds()
        // キューも空にする（演奏待ちもキャンセルするため）
        commandQueue = []
    }
    // メロディ再生 (MELODY:タイプ:ID)
    // 例: MELODY:S:1 (サウンドの1番)
    // 例: MELODY:M:0 (メロディの0番)
    else if (command.includes("MELODY:")) {
        let parts = command.split(":")
        let type = parts[1].trim() // "S" か "M"
        let id = parseFloat(parts[2])

        if (type == "S") {
            // サウンド再生 (範囲チェック付)
            if (id >= 0 && id < soundList.length) {
                //soundList[id].play()
                music.play(music.builtinPlayableSoundEffect(soundList[id]), music.PlaybackMode.UntilDone)
            }
        }
        else if (type == "M") {
            // メロディ再生
            if (id >= 0 && id < melodyList.length) {
                //music.startMelody(music.builtInMelody(melodyList[id]), MelodyOptions.Once)
                music._playDefaultBackground(music.builtInPlayableMelody(melodyList[id]), music.PlaybackMode.UntilDone)
            }
        }
    }

    // 単音再生
    else if (command.includes("TONE:")) {
        music.setBuiltInSpeakerEnabled(true)
        music.setVolume(127)
        let parts = command.split(":")
        if (parts.length >= 3) {
            let freq = parseFloat(parts[1])
            let duration = parseFloat(parts[2])
            // ここで音が鳴り終わるまでブロックされるが、
            // 受信処理(onDataReceived)は裏で動けるのであふれない！
            music.playTone(freq, duration)
        }
    }
    // その他の表示系コマンド
    else if (command == "CLEAR") basic.clearScreen()
    else if (command == "HEART") basic.showIcon(IconNames.Heart)
    else if (command == "SMILE") basic.showIcon(IconNames.Happy)
    else if (command == "NO") basic.showIcon(IconNames.No)
    else if (command.includes("ICON:")) {
        let id = parseFloat(command.split(":")[1])
        basic.showIcon(id)
    }
    else if (command.includes("ARROW:")) {
        let id = parseFloat(command.split(":")[1])
        basic.showArrow(id)
    }
    else if (command.includes("MSG:")) {
        let text = command.substr(4, command.length - 4)
        basic.showString(text)
    }
    // LED画面に表示 (0と1で制御)
    // コマンド例: "LED:1010001010..." (計25文字)
    else if (command.includes("LED:")) {
        // "LED:" の後ろの文字列を取り出す
        let pattern = command.split(":")[1]

        // 25文字あるか確認（念のため）
        if (pattern.length == 25) {
            for (let i = 0; i < 25; i++) {
                // 座標を計算 (左上が0,0)
                let x = i % 5
                let y = Math.floor(i / 5)

                // 文字が "1" なら点灯、それ以外("0")なら消灯
                if (pattern.charAt(i) == "1") {
                    led.plot(x, y)
                } else {
                    led.unplot(x, y)
                }
            }
        }
    }
    // 消灯 (UNPLOT:x:y)　PLOTの判定よりも先に配置すること！
    else if (command.includes("UNPLOT:")) {
        let parts = command.split(":")
        let x = parseFloat(parts[1])
        let y = parseFloat(parts[2])
        led.unplot(x, y)
    }
    // 点灯 (PLOT:x:y)
    else if (command.includes("PLOT:")) {
        let parts = command.split(":")
        let x = parseFloat(parts[1])
        let y = parseFloat(parts[2])
        led.plot(x, y)
    }
    // ★★★ 追加: アナログ出力 (ANALOG:pin:value) ★★★
    // 例: P0に512を出力 → ANALOG:P0:512
    else if (command.includes("ANALOG:")) {
        let parts = command.split(":")
        let pinName = parts[1]
        let val = parseFloat(parts[2])

        // ピン名で分岐
        if (pinName == "P0") pins.analogWritePin(AnalogPin.P0, val)
        else if (pinName == "P1") pins.analogWritePin(AnalogPin.P1, val)
        else if (pinName == "P2") pins.analogWritePin(AnalogPin.P2, val)
    }
    // サーボモーター制御 (SERVO:Pin:Angle)
    else if (command.includes("SERVO:")) {
        let parts = command.split(":")
        let pinName = parts[1]
        let angle = parseFloat(parts[2])

        // サーボを使うときは、自動的に読み取り(入力)をOFFにする
        // これをしないと、センサー送信処理と喧嘩してサーボがガタガタ震えます
        if (pinName == "P0") {
            enableReadP0 = false
            pins.servoWritePin(AnalogPin.P0, angle)
            //servos.P0.setAngle(angle)
        }
        else if (pinName == "P1") {
            enableReadP1 = false
            pins.servoWritePin(AnalogPin.P1, angle)
            //servos.P0.setAngle(angle)
        }
        else if (pinName == "P2") {
            enableReadP2 = false
            pins.servoWritePin(AnalogPin.P2, angle)
            //servos.P0.setAngle(angle)
        }
    }

    else if (command.includes("P0:")) {
        let val = parseFloat(command.substr(3, 1))
        pins.digitalWritePin(DigitalPin.P0, val)
    }
    else if (command.includes("P1:")) {
        let val = parseFloat(command.substr(3, 1))
        pins.digitalWritePin(DigitalPin.P1, val)
    }
    else if (command.includes("P2:")) {
        let val = parseFloat(command.substr(3, 1))
        pins.digitalWritePin(DigitalPin.P2, val)
    }
}

// --- 受信処理（USB）（ここは「受け取ってリストに入れるだけ」にする） ---
// ※こうすることで、受信処理が一瞬で終わり、次のデータを取りこぼさなくなります
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let command = serial.readUntil(serial.delimiters(Delimiters.NewLine))
    // リストの末尾に追加
    // ★重要：待ち行列が20個以上溜まっていたら、無視する（エラー070防止）
    if (commandQueue.length < 20) {
        commandQueue.push(command)
    }
})

// --- ★コマンド実行ループ（バックグラウンドで高速処理）---
basic.forever(function () {
    if (commandQueue.length > 0) {
        let command = commandQueue.shift() // 先頭を取り出す
        processCommand(command) // 実行
    } else {
        basic.pause(20) // キューが空なら少し休む
    }
})

// --- センサー送信 ---
// これまでは "ACC:x,y,z" だけでしたが、
// "DAT:accX,accY,accZ,btnA,btnB,light,temp,p0,p1,p2" という形式で全部送ります
basic.forever(function () {
    if (isSending) {
        // 1. 加速度
        let ax = input.acceleration(Dimension.X)
        let ay = input.acceleration(Dimension.Y)
        let az = input.acceleration(Dimension.Z)

        // 2. ボタンの状態 (押されていれば1, 離れていれば0)
        let ba = input.buttonIsPressed(Button.A) ? 1 : 0
        let bb = input.buttonIsPressed(Button.B) ? 1 : 0

        // 3. 環境センサー
        let li = input.lightLevel()
        let te = input.temperature()

        // 4. 端子の状態 (デジタル入力 0 or 1)
        // ※端子に何も繋いでいないと不安定になることがありますが仕様です
        // ★★★ ここを変更：フラグを見て読み取るかどうか決める ★★★
        let p0 = 0
        if (enableReadP0) {
            p0 = pins.digitalReadPin(DigitalPin.P0)
        }
        let p1 = 0
        if (enableReadP1) {
            p1 = pins.digitalReadPin(DigitalPin.P1)
        }
        let p2 = 0
        if (enableReadP2) {
            p2 = pins.digitalReadPin(DigitalPin.P2)
        }
        // ★追加：ロゴのタッチ状態を取得 (1=タッチ中, 0=なし)
        let lo = input.logoIsPressed() ? 1 : 0

        // 全部つなげて送信 (DAT:...)
        serial.writeString("DAT:" + ax + "," + ay + "," + az + "," + ba + "," + bb + "," + li + "," + te + "," + p0 + "," + p1 + "," + p2 + "," + lo + "\n")

        basic.pause(250)
    } else {
        basic.pause(250)
    }
})

// --- 起動確認 ---
basic.showIcon(IconNames.Yes)
basic.pause(500)
basic.clearScreen()

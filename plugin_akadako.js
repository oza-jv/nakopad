/**
 * なでしこ3用 AkaDako制御プラグイン (plugin_akadako.js)
 */
const PluginAkaDako = {
    'meta': {
        type: 'const',
        value: {
            pluginName: 'plugin_akadako',
            description: 'AkaDakoを制御するプラグイン（runServoTurn公式対応版）',
            pluginVersion: '1.28',
            nakoRuntime: ['browser'],
            nakoVersion: '3.6.0' 
        }
    },
    '初期化': {
        type: 'func',
        josi: [],
        fn: function (sys) {
            if (typeof window.__akadako_board === 'undefined') {
                window.__akadako_board = null;
            }
        }
    },
    'アカダコ接続': {
        type: 'func',
        josi: [],
        asyncFn: true,
        fn: async function (sys) {
            if (typeof AkaDako === 'undefined') throw new Error('akadako.jsが読み込まれていません。');
            if (window.__akadako_board && window.__akadako_board.isConnected) return; 
            
            window.__akadako_board = await AkaDako.connect(); 
            
            if (window.__akadako_board && window.__akadako_board.isConnected) {
                const msg = "AkaDaKoを接続しました。";
                if (typeof nako3_print === 'function') nako3_print(msg);
                else if (sys.__exec) sys.__exec('表示', [msg]);
            }
        }
    },
    'アカダコ未接続': {
        type: 'func',
        josi: [],
        fn: function (sys) {
            if (!window.__akadako_board) return true;
            return !window.__akadako_board.isConnected; 
        }
    },
    'アカダコ切断': {
        type: 'func',
        josi: [],
        fn: function (sys) {
            if (window.__akadako_board) {
                window.__akadako_board.disconnect(); 
                window.__akadako_board = null;
                const msg = "AkaDaKoを切断しました。";
                if (typeof nako3_print === 'function') nako3_print(msg);
                else if (sys.__exec) sys.__exec('表示', [msg]);
            }
        }
    },
    'アカダコLED点灯': {
        type: 'func',
        josi: [['を'], ['で']], 
        isVariableJosi: true,
        return_none: true,
        asyncFn: true,
        fn: async function (colorVal, ...pID) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;

            try {
                let colorObj;
                if (typeof colorVal === 'string') {
                    const c = colorVal.replace('色', '');
                    switch (c) {
                        case '赤': colorObj = AkaDako.Color.Red; break;
                        case 'オレンジ': case '橙': colorObj = AkaDako.Color.Orange; break;
                        case '黄': colorObj = AkaDako.Color.Yellow; break;
                        case '緑': colorObj = AkaDako.Color.Green; break;
                        case '青': colorObj = AkaDako.Color.Blue; break;
                        case '藍': colorObj = AkaDako.Color.Indigo; break;
                        case '紫': colorObj = AkaDako.Color.Violet; break;
                        case 'パープル': colorObj = AkaDako.Color.Purple; break;
                        case '白': colorObj = AkaDako.Color.White; break;
                        case '黒': colorObj = AkaDako.Color.Black; break;
                        default: colorObj = AkaDako.Color.White; 
                    }
                } 
                else if (Array.isArray(colorVal) && colorVal.length >= 3) {
                    const r = parseInt(colorVal[0]) || 0;
                    const g = parseInt(colorVal[1]) || 0;
                    const b = parseInt(colorVal[2]) || 0;
                    colorObj = new AkaDako.Color(r, g, b);
                } 
                else {
                    colorObj = AkaDako.Color.Black;
                }

                let brVal = 100;
                const sys = pID.pop();
                if( pID.length > 0 )  {
                    brVal = pID[0];
                }

                let b = parseInt(brVal);
                if (isNaN(b)) b = 100;
                if (b < 0) b = 0;
                if (b > 100) b = 100;
                
                colorObj = colorObj.brightness(b);

                await board.runColorLedFillColor(AkaDako.ColorLed.OnBoard, colorObj); 
                await board.runColorLedShow(); 
            } catch (e) {}
        }
    },
    'アカダコLED虹色': {
        type: 'func',
        josi: [['で', 'に']], 
        asyncFn: true,
        fn: async function (a, sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;
            try {
                const rainbow = new AkaDako.Rainbow(a); 
                await board.runColorLedFillColor(AkaDako.ColorLed.OnBoard, rainbow); 
                await board.runColorLedShow(); 
            } catch (e) {}
        }
    },
    'アカダコLED消灯': {
        type: 'func',
        josi: [],
        asyncFn: true,
        fn: async function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;
            try {
                await board.runColorLedClear(AkaDako.ColorLed.OnBoard); 
            } catch (e) {}
        }
    },
    'アカダコ距離': {
        type: 'func',
        josi: [],
        asyncFn: true,
        return_none: false, 
        fn: async function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return -1;
            try {
                const val = await board.fetchOpticalDistance(); 
                const res = (val !== undefined && val !== null) ? val : -1;
                sys.tags['それ'] = res;
                return res; 
            } catch (e) {
                sys.tags['それ'] = -1;
                return -1;
            }
        }
    },
    'アカダコ照度': {
        type: 'func',
        josi: [],
        asyncFn: true,
        return_none: false, 
        fn: async function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return -1;
            
            try {
                let val = undefined;
                try {
                    val = await board.fetchBrightness();
                } catch (err) {
                    if (typeof board.analogBrightness === 'function') {
                        val = await board.analogBrightness();
                    } else if (typeof board.analogRead === 'function') {
                        const pin = (AkaDako.AnalogRead && AkaDako.AnalogRead.LightSensor !== undefined) 
                                    ? AkaDako.AnalogRead.LightSensor : 1;
                        val = await board.analogRead(pin);
                    }
                }
                const res = (val !== undefined && val !== null && !isNaN(val)) ? val : -1;
                sys.tags['それ'] = res;
                return res; 
            } catch (e) {
                sys.tags['それ'] = -1;
                return -1;
            }
        }
    },
    'アカダコ人感': {
        type: 'func',
        josi: [],
        return_none: false,
        fn: function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return -1;
            try {
                const isHigh = board.digital(AkaDako.DigitalRead.MotionSensor);
                const res = isHigh ? 1 : 0;
                sys.tags['それ'] = res;
                return res;
            } catch (e) {
                sys.tags['それ'] = -1;
                return -1;
            }
        }
    },
    'アカダコA1アナログ': {
        type: 'func',
        josi: [],
        return_none: false,
        fn: function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return -1;
            try {
                const val = board.analog(AkaDako.AnalogRead.A1);
                sys.tags['それ'] = val;
                return val;
            } catch (e) {
                sys.tags['それ'] = -1;
                return -1;
            }
        }
    },
    'アカダコA1入力': {
        type: 'func',
        josi: [],
        return_none: false,
        fn: function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return -1;
            try {
                const isHigh = board.digital(AkaDako.DigitalRead.A1);
                const val = isHigh ? 1 : 0;
                sys.tags['それ'] = val;
                return val;
            } catch (e) {
                sys.tags['それ'] = -1;
                return -1;
            }
        }
    },
    'アカダコデジタルA1出力': {
        type: 'func',
        josi: [['を', 'に', 'で']],
        asyncFn: true,
        fn: async function (val, sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;
            try {
                let l = parseInt(val);
                if (isNaN(l)) l = 0;
                if (l < 0) l = 0;
                if (l > 100) l = 100;
                await board.runPwmSet(AkaDako.PwmWrite.A1, l);
            } catch (e) {}
        }
    },
    'アカダコデジタルA1オン': {
        type: 'func',
        josi: [],
        asyncFn: true,
        fn: async function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;
            try {
                await board.runDigitalSet(AkaDako.DigitalWrite.A1, true);
            } catch (e) {}
        }
    },
    'アカダコデジタルA1オフ': {
        type: 'func',
        josi: [],
        asyncFn: true,
        fn: async function (sys) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;
            try {
                await board.runDigitalSet(AkaDako.DigitalWrite.A1, false);
                if (typeof board.runPwmSet === 'function') {
                    await board.runPwmSet(AkaDako.PwmWrite.A1, 0);
                }
            } catch (e) {}
        }
    },

    // ==========================================
    // --- 修正箇所：マニュアル記載の runServoTurn を使用 ---
    // ==========================================
    'アカダコデジタルA1サーボ出力': {  // speed(0-100%)でangleに(を)アカダコデジタルA1サーボ出力。
        type: 'func',
        josi: [['で'], ['を', 'に']],
        isVariableJosi: true,
        asyncFn: true,
        fn: async function (speedOrAngle, ...pID) {
            const board = window.__akadako_board;
            if (!board || !board.isConnected) return;
            
            const sys = pID.pop();
            let speed = 100; // 速度省略時は 100(%) をデフォルトにする
            let angle = 90;
            
            if (pID.length > 0) {
                speed = parseInt(speedOrAngle);
                angle = parseInt(pID[0]);
            } else {
                angle = parseInt(speedOrAngle);
            }

            try {
                // 角度の安全処理
                if (isNaN(angle)) angle = 90;
                if (angle < 0) angle = 0;
                if (angle > 180) angle = 180;
                
                // 速度の安全処理
                if (isNaN(speed)) speed = 100;
                if (speed > 100) speed = 100;
                if (speed < 0) speed = 0;
                
                // マニュアル通り、AkaDako.DigitalWrite.A1 をターゲットに指定
                const targetPin = AkaDako.DigitalWrite.A1;

                if (typeof board.runServoTurn === 'function') {
                    // board.runServoTurn(target, speed, angle) を実行
                    await board.runServoTurn(targetPin, speed, angle);
                } else {
                    console.error("❌ [AkaDako] board.runServoTurn が見つかりません。");
                }
            } catch (e) {
                console.error("❌ [AkaDako] 実行時エラー:", e);
            }
        }
    }
};

if (typeof navigator !== 'undefined') {
    navigator.nako3.addPluginObject('PluginAkaDako', PluginAkaDako);
}

// ==========================================
// HTMLのリンクやボタン(onclick)から呼び出すための関数
// ==========================================

/**
 * AkaDakoを接続する
 */
window.connectAkaDako = async function() {
    try {
        if (typeof AkaDako === 'undefined') {
            nako3_print("==ERROR==akadako.jsが読み込まれていません。先に読み込んでください。");
            return;
        }
        // 既に接続されている場合は何もしない
        if (window.__akadako_board && window.__akadako_board.isConnected) {
            nako3_print("既に接続されています。");
            return;
        }
        // 接続画面を表示して接続
        window.__akadako_board = await AkaDako.connect();
        
        if (window.__akadako_board && window.__akadako_board.isConnected) {
            console.log("AkaDako Connected via Link");
            nako3_print("AkaDakoを接続しました。");
        }
    } catch (e) {
        console.error("接続エラー:", e);
        nako3_print("==ERROR==接続エラー: " + e);
    }
};

/**
 * AkaDakoを切断する
 */
window.disconnectAkaDako = function() {
    if (window.__akadako_board) {
        window.__akadako_board.disconnect();
        window.__akadako_board = null;
        nako3_print("AkaDakoを切断しました。");
    } else {
        nako3_print("==ERROR==AkaDakoは接続されていません。");
    }
};
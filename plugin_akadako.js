/**
 * なでしこ3用 AkaDako制御プラグイン (plugin_akadako.js)
 */
const PluginAkaDako = {
    'meta': {
        type: 'const',
        value: {
            pluginName: 'plugin_akadako',
            description: 'AkaDakoを制御するプラグイン（製品版仕様）',
            pluginVersion: '1.16',
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
                const msg = "アカダコを接続しました。もう一度プログラムを実行してください。";
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
                const msg = "アカダコを切断しました。";
                if (typeof nako3_print === 'function') nako3_print(msg);
                else if (sys.__exec) sys.__exec('表示', [msg]);
            }
        }
    },
    'アカダコLED虹色': {
        type: 'func',
        josi: ['で'],
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
                    // タコラッチミニ等のアナログセンサーへのフォールバック
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
    }
};

if (typeof navigator !== 'undefined') {
    navigator.nako3.addPluginObject('PluginAkaDako', PluginAkaDako);
}
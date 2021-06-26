/**
 * なでしこ3 追加プラグイン 2021/6/22
 * file : plugin_nakoboard.js
 * Chromeブラウザでなでしこボードを使うためのプラグイン。
 */

// 変数定義
let outputReportId = 0;
let device;
let ADval = 0;
let USBconnected = 0;	// 処理可＝1，不可＝０
let outputReport = new Uint8Array(64);

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
		USBconnected = -1;			// 未接続
	} else if( device.opened ) {
		USBconnected = 1;			// 接続＆オープン完了
	} else {
		USBconnected = 0;			// 接続したが未オープン
	}
	//console.log('ChkHIDItem: ' + USBconnected);
	return USBconnected;
};


/*---------------------------------------------
   WebHID用の関数群
  ---------------------------------------------*/
// 接続時のイベント
navigator.hid.addEventListener('connect', ({device}) => {
	console.log(`HID connected: ${device.productName}`);
});

//切断時のイベント
navigator.hid.addEventListener('disconnect', ({device}) => {
	console.log(`HID disconnected: ${device.productName}`);
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
	Wait_input = 0;
}

// promiseを使ったnミリ秒待機
const waitFor = (n) => new Promise(resolve => setTimeout(resolve, n));

// n秒間待機
function sleep(msec) {
	// 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
	var startMsec = new Date();
	while (new Date() - startMsec < msec);
}

// センサ１測定用の関数
let WaitForInputReport;		// 「ボード接続」内で定義


/*---------------------------------------------
   なでしこプラグインでの命令追加
  ---------------------------------------------*/
const PluginNakoBoard = {
  'ボード接続': {
    type: 'func',
    josi: [[]],
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
			});
		})().catch( e => console.log(e) );
    }
  },
  
  'ボード切断': {
    type: 'func',
    josi: [[]],
    fn: function (text, sys) {
		if (!device) return;
		if( ChkHIDItem() < 1 ) return;

		device.close();
		console.log(`${device.productName} opened: ${device.opened}`);
    }
  },
  
  'ボード状態': {
    type: 'func',
    josi: [[]],
    fn: function (sys) {
		ChkHIDItem();
		return USBconnected;
    }
  },

  '秒待': {
    type: 'func',
    josi: [[]],
    return_none: true,
    fn: async function (text, sys) {
		if( USBconnected == 1 ) {
			let sec = Number( text );
			if( isNaN(sec) ) return;
			if( sec<0 ) return;
			if( sec>10 ) sec=10;
			
			//await waitFor(sec*1000);
			sleep(sec*1000)
		}
    }
  },

  '発音': {
    type: 'func',
    josi: [[], ['を']],
    isVariableJosi: true,
    return_none: true,
    fn: function (...pID) {
    	let note = 15;
    	
    	// 引数チェック
    	const sys = pID.pop();
    	if( pID.length > 0 ) {
    		// 数値チェック
    		let text = pID[0];
			note = Number( text );
			if( isNaN(note) ) note = 15;
			if( note < 0  ) note = 0;
			if( note > 23 ) note = 23;
		} else {
			note = 15;
		}

		ChkHIDItem();
		if( USBconnected == 1 ) {
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
			console.log(`beep on  note:${note}`);
			sleep(500);

			// beep
			beep_turnoff();
			device.sendReport(outputReportId, outputReport);
			//sleep(200);
			console.log("beep off");
			
		}
	}
  },

  'LEDオン': {
    type: 'func',
    josi: [[]],
    fn: function (text, sys) {
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
    josi: [[]],
    fn: function (text, sys) {
		ChkHIDItem();
		if( USBconnected == 1 ) {
			// turn on
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
    josi: [[]],
    fn: function (text, sys) {
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
    josi: [[]],
    fn: function (text, sys) {
		ChkHIDItem();
		if( USBconnected == 1 ) {
			// turn on
			outputReport[0] = 'O'.charCodeAt(0);
			outputReport[1] = 1;
			outputReport[2] = 0;
			device.sendReport(outputReportId, outputReport);
			console.log("output1 turn off");
		}
	}
  },

  /*
  'センサ1測定': {
    type: 'func',
    josi: [],
    return_none: false,
    fn: function (sys) { 
    	ChkHIDItem();
		if( USBconnected == 1 ) {
			let result;
			
			async function WaitForInput() {
				try {
					outputReport[0] = 'A'.charCodeAt(0);
					await device.sendReport(outputReportId, outputReport)
					await WaitForInputReport();
					console.log( ADval );
					result = ADval;
					console.log( `センサ1測定a: ${ADval}` );
					return ADval;
				} catch(e) {
					throw -1;
				}
			}
			WaitForInput().then( res => {
				console.log( `res: ${res}` );
				return res;
			});
			
			sleep(500);
			console.log( `センサ1測定b: ${ADval}` );
			return ADval;
		}
	}
  },
  */

  'センサ1': { type: 'var', value: 0 },
  'センサ1測定時': {
    type: 'func',
    josi: [['で']],
    pure: true,
    return_none: true,
    fn: function (callback, sys) { 
    	ChkHIDItem();
		if( USBconnected == 1 ) {
			let result;
			
			async function WaitForInput(sys) {
				try {
					outputReport[0] = 'A'.charCodeAt(0);
					await device.sendReport(outputReportId, outputReport)
					await WaitForInputReport();
					console.log( ADval );
					result = ADval;
					console.log( `センサ1測定時a: ${ADval}` );
					return ADval;
				} catch(e) {
					throw e;
				}
			}
			WaitForInput().then( res => {
				console.log( `res: ${res}` );
				return res;
			}).then(text => {
				sys.__v0['センサ1'] = text;
				callback(text);
			}).catch(err => {
				console.log('[センサ1測定時.error]', err);
			});
		}
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

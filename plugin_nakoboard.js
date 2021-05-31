/**
 * なでしこ3 追加プラグイン 2021/5/3
 * file : plugin_nakoboard.js
 * Chromeブラウザでなでしこボードを使うためのプラグイン。
 */

// JSルーチン
let outputReportId = 0;
let device;
var ADval = 0;
var USBconnected = 0;	// 処理可＝1，不可＝０
var outputReport = new Uint8Array(64);

// Add 2021/5/26 By Matsunaga /////////
var ReadFlag = 0;
var ADval2 = 0;
////////////////


const filters = [
  {
    // なでしこボードのHIDフィルタ
    vendorId: 0x3289,
    productId: 0x2001
  }
];

/*---------------------------------------------*/

// 接続状態の確認
function ChkHIDItem() {
	if (!device)  {
		USBconnected = -1;			// 未接続
	} else if( device.opened ) {
		USBconnected = 1;			// 接続＆オープン完了
	} else {
		USBconnected = 0;			// 接続したが未オープン
	}
	return USBconnected;
};

// 接続時のイベント
navigator.hid.addEventListener('connect', ({device}) => {
	console.log(`HID connected: ${device.productName}`);
});

//切断時のイベント
navigator.hid.addEventListener('disconnect', ({device}) => {
	console.log(`HID disconnected: ${device.productName}`);
});


// ヘルパー関数
const waitFor = (n) => new Promise(resolve => setTimeout(resolve, n));
function sleep(msec) {
	// 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
	var startMsec = new Date();
	while (new Date() - startMsec < msec);
}

// センサ１測定用の関数
const WaitForInputReport = () => new Promise(resolve => device.addEventListener("inputreport", resolve));
async function AD1input() {
	// send
	outputReport[0] = 'A'.charCodeAt(0);
	await device.sendReport(outputReportId, outputReport);
	
	// recieve
// Add 2021/5/30 By Matsunaga /////////
	await WaitForInputReport()		// イベント発生まで待つ
    let data = await device.receiveReport(inputreportId);
	ADval = data.getUint8(2);
	ADval = (ADval << 8) | data.getUint8(1);
	console.log( `AD1input: ${ADval}` );
	ReadFlag = 1;
////////////////
	return ADval;
}

// ボード側から受信したときのイベント
function handleInputReport(e) {
	const { data, device, reportId } = e;
	if( (device.productId !== filters.productId) || (reportId !== 0) ) return;
	
	//console.log(e.device.productName + ": got input report " + reportId);
	//console.log(new Uint8Array(data.buffer));
	
	// 測定値
	ADval = data.getUint8(2);
	ADval = (ADval << 8) | data.getUint8(1);
// Add 2021/5/26 By Matsunaga /////////
	ReadFlag = 1;
////////////////
	console.log(`sensor: ${ADval}` );
}

function setADval(v) {
	ADval = v;
}

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

/*---------------------------------------------*/
// なでしこ用命令の追加
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
		if( ChkHIDItem == 1 ) return;

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
				chkReportID(device);
			});

			await device.addEventListener("inputreport", handleInputReport);
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
		isEXEC = 0;
    }
  },
  
  'ボード状態': {
    type: 'func',
    josi: [[]],
    fn: function (sys) {
		ChkHIDItem();
		console.log(USBconnected);
		return USBconnected;
    }
  },

  '秒待': {
    type: 'func',
    josi: [[]],
    fn: function (text, sys) {
		if( USBconnected == 1 ) {
			var sec = Number( text );
			if( isNaN(sec) ) return;
			if( sec<0 ) return;
			if( sec>10 ) sec=10;
			sleep(sec*1000)
		}
    }
  },


  '発音': {
    type: 'func',
    josi: [[]],
    fn: function (text, sys) {
    	var note;

		ChkHIDItem();
		if( USBconnected == 1 ) {
			note = 15;

			// beep
			outputReport[0] = 'P'.charCodeAt(0);
			outputReport[1] = note;
			device.sendReport(outputReportId, outputReport);
			console.log(`beep on  note:${note}`);

			//await waitFor(500);
			sleep(500);

			// beep
			outputReport[0] = 'P'.charCodeAt(0);
			outputReport[1] = 23;
			device.sendReport(outputReportId, outputReport);
			console.log("beep off");
			sleep(200);
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

  'センサ値': {type: 'var', value: 0 },
  'センサ1測定': {
    type: 'func',
    josi: [],
    return_none: false,
    pure: true,
    fn: function (sys) { 
    	ChkHIDItem();
		if( USBconnected == 1 ) {
			/*
			AD1input();
			waitFor(300)
			.then(() => {
				sys.__v0['センサ値'] = ADval;
				//console.log( `result: ${result}` );
				console.log( `センサ値: ${sys.__v0['センサ値']}` );
				return ADval;
			});
			*/
			
			// send
			//outputReport[0] = 'A'.charCodeAt(0);
			//device.sendReport(outputReportId, outputReport);

			ReadFlag = 0;
			
			// recieve
			//WaitForInputReport()		// イベント発生まで待つ
			/*.then( (resolve, reject) => {
				console.log( `result: ${ADval}` );
				resolve(ADval);
			});
			*/
// Add 2021/5/26 By Matsunaga /////////
			ReadFlag = 0;
			AD1input();
//			while(ReadFlag == 0){
//			}
////////////////
			
			console.log( `result: ${ADval}` );
			return ADval;
		} else {
			return -2;
		};
	},
	return_none: false
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

<?php
	mb_http_output('UTF-8');
	mb_internal_encoding('UTF-8');
	header('Content-Type: text/plain; charset=UTF-8');
	// 郵便番号を取得
	$result = file_get_contents('http://zip.cgis.biz/xml/zip.php?zn='.$_GET['zip']);

	$x = simplexml_load_string( $result );
	//print_r( $x );
	
	if( $x !== false ) {
		if( !is_null($x->ADDRESS_value) ) {
			$d = $x->ADDRESS_value->value[4]->attributes()->state;
			$d = $d . ' ' . $x->ADDRESS_value->value[5]->attributes()->city;
			$d = $d . ' ' . $x->ADDRESS_value->value[6]->attributes()->address;
		} else {
			//$d = $x->result[7]->attributes()->error_note;
			$d = '郵便番号が誤っています';
		}
		print( $d );
	}
?>

<?php
	mb_http_output('UTF-8');
	mb_internal_encoding('UTF-8');
	header('Content-Type: text/plain; charset=UTF-8');
	$result = file_get_contents('https://www.mhlw.go.jp/content/pcr_positive_daily.csv');
	$result2 = str_replace(",,", "", $result);
	$result2 = str_replace(" ",  "", $result2);
	print( $result2 );
?>


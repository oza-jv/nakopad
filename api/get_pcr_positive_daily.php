<?php
	mb_http_output('UTF-8');
	mb_internal_encoding('UTF-8');
	header('Content-Type: text/plain; charset=UTF-8');

	$ctx = stream_context_create(array(
	  'http' => array(
	    'method' => 'GET',
	    'header' => 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36')
	  )
	);
	$csv_file = file_get_contents("https://covid19.mhlw.go.jp/public/opendata/newly_confirmed_cases_daily.csv", false, $ctx);

  $ary = explode("\n", $csv_file);
  
  foreach( $ary as $key => $value ) {
    $tmp = explode(",", $value);
    if( $key == 0 ) {
      echo "日付,新規陽性者数\n";
      continue;
    }

    if( $tmp[1] != "ALL" ) continue;
    echo $tmp[0] . "," . $tmp[2] . "\n";
  }
?>


<?php
	require_once 'config.php';
	$link = mysql_connect($config['host'],$config['username'],$config['password'],$config['dbname']);
	if (!$link) {
    die('Could not connect: ' . mysql_error());
}
echo 'Connected successfully';
mysql_close($link);
?>
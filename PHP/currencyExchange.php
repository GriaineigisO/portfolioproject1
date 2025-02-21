<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Allow cross-origin requests (only needed if making requests from different origins)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");



$executionStartTime = microtime(true);

$url = 'https://openexchangerates.org/api/latest.json?app_id=b038fe3dae844fc6b6cca870757a0fa4';

$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_URL, $url);

$result = curl_exec($ch);
if ($result === false) {
    $output['status']['code'] = "500";
    $output['status']['name'] = "error";
    $output['status']['description'] = "Failed to fetch data from the API.";
    $output['data'] = [];
    echo json_encode($output);
    exit;
}
curl_close($ch);

echo json_encode($result);

<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Allow cross-origin requests (only needed if making requests from different origins)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
$apiKey = getenv('weatherAPI');
$executionStartTime = microtime(true);

// $lat = isset($_GET['lat']) ? urlencode($_GET['lat']) : '';
// $lng = isset($_GET['lng']) ? urlencode($_GET['lng']) : '';

$capital = isset($_GET['capital']) ? urlencode($_GET['capital']) : '';


$url = "http://api.weatherapi.com/v1/forecast.json?key=" . $apiKey . "&q=" . $capital ;

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

// Decode JSON response
$data = json_decode($result, true);
if ($data === null) {
    $output['status']['code'] = "500";
    $output['status']['name'] = "error";
    $output['status']['description'] = "Failed to decode JSON from the API.";
    $output['data'] = [];
    echo json_encode($output);
    exit;
}

$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "success";
$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
$output['data'] = $data;

// Output JSON
echo json_encode($output);

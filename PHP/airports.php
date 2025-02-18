<?php
require 'config.php';
ini_set('display_errors', 'On');
error_reporting(E_ALL);


$apiKey = getenv('airportAPIKEY');

// Allow cross-origin requests (only needed if making requests from different origins)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");


$executionStartTime = microtime(true);

$country = isset($_GET['country']) ? urlencode($_GET['country']) : '';

$url = "https://api.api-ninjas.com/v1/airports?country=" . $country;

$ch = curl_init();
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_URL, $url);


curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-Api-Key: $apiKey"
]);

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

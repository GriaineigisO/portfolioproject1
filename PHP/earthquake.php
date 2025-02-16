<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Allow cross-origin requests (only needed if making requests from different origins)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$executionStartTime = microtime(true);

$north = isset($_GET['north']) ? urlencode($_GET['north']) : '';
$south = isset($_GET['south']) ? urlencode($_GET['south']) : '';
$east = isset($_GET['east']) ? urlencode($_GET['east']) : '';
$west = isset($_GET['west']) ? urlencode($_GET['west']) : '';

$url = "http://api.geonames.org/earthquakesJSON?north=" . $north . "&south=" . $south . "&east=" . $east . "&west=" . $west . "&username=maarcis";

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

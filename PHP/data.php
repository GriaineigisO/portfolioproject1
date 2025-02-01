<?php

// Allow all origins (or specify your frontend URL instead of "*")
header("Access-Control-Allow-Origin: *"); 

// Allow specific HTTP methods
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// Allow specific headers
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight (OPTIONS request)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Serve JSON data
header("Content-Type: application/json");

$jsonFilePath = __DIR__ . '/../countryBorders.geo.json';
$countryList = file_get_contents($jsonFilePath);

echo $countryList;


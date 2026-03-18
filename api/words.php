<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$pool = [
    'kwenta', 'trabaho', 'pera', 'magawa', 'makain', 'silbi', 'dahilan',
    'katuwiran', 'kinabukasan', 'katinuan', 'tulong', 'pangarap', 'masabi', 'layunin',
    'kalayaan', 'saysay', 'pagasa', 'lakas', 'buhay', 'patutunguhan',
    'tulugan', 'galang', 'emosyon', 'kasama', 'karapatan', 'pagkakataon'
];

shuffle($pool);
$count = rand(10, 20);
$words = array_slice($pool, 0, $count);
$words[] = 'studio';

echo json_encode(['words' => $words]);

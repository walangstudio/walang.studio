<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$apps = [
    [
        'id'     => 'APP I',
        'title'  => 'The Communicator',
        'desc'   => 'A most remarkable device for the transmission of messages across great distances. Correspondence delivered with mechanical precision.',
        'status' => 'AVAILABLE',
    ],
    [
        'id'     => 'APP II',
        'title'  => 'The Ledger',
        'desc'   => 'Accounts kept with unfailing accuracy and great dignity. Every transaction recorded, nothing forgotten.',
        'status' => 'AVAILABLE',
    ],
    [
        'id'     => 'APP III',
        'title'  => 'The Cartographer',
        'desc'   => 'Charting territories known and unknown. A guide for the modern explorer of digital realms.',
        'status' => 'IN DEVELOPMENT',
    ],
];

echo json_encode(['apps' => $apps]);

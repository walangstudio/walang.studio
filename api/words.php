<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$batches = [
    1 => ['kwenta', 'tarabaho', 'pera', 'magawa', 'makain', 'silbi', 'dahilan', 'katuwiran', 'mahal', 'bukas'],
    2 => ['tulong', 'pangarap', 'hirap', 'layunin', 'kalayaan', 'saysay', 'pagasa', 'lakas', 'buhay', 'daan'],
];

$batch = isset($_GET['batch']) ? (int) $_GET['batch'] : 1;
if ($batch < 1 || $batch > count($batches)) {
    $batch = 1;
}

echo json_encode([
    'words' => $batches[$batch],
    'batch' => $batch,
    'next'  => ($batch % count($batches)) + 1,
]);

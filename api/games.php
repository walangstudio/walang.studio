<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$games = [
    [
        'badge' => 'NOW PLAYING',
        'title' => 'The Grand Puzzle',
        'desc'  => 'A diversion of the highest order. Test your faculties against an apparatus of considerable ingenuity. Suitable for all ages of discerning mind.',
    ],
    [
        'badge' => 'COMING SOON',
        'title' => 'The Mystery of Room 7',
        'desc'  => 'An interactive drama of the thriller variety. The culprit lurks among the guests. Your deduction is required.',
    ],
    [
        'badge' => 'COMING SOON',
        'title' => 'The Automaton',
        'desc'  => 'A mechanical man requires your guidance through a world of gears and consequence. Philosophy disguised as amusement.',
    ],
];

echo json_encode(['games' => $games]);

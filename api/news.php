<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$articles = [
    [
        'date'     => 'March, 1926',
        'headline' => 'Studio Announces New Season of Productions',
        'body'     => 'The studio has confirmed a full slate of moving pictures for the forthcoming year. Titles include works of drama, comedy, and spectacle. Details to follow in due course.',
    ],
    [
        'date'     => 'February, 1926',
        'headline' => 'The Projector Has Been Repaired',
        'body'     => 'After a lengthy intermission, the apparatus is once again operational. We apologise for the inconvenience and thank our audience for their patience.',
    ],
    [
        'date'     => 'January, 1926',
        'headline' => 'First Moving Picture Completed',
        'body'     => 'The studio is pleased to announce the completion of its inaugural production. Screenings will commence at the earliest opportunity.',
    ],
    [
        'date'     => 'December, 1925',
        'headline' => 'Studio Established in the City',
        'body'     => 'walang.studio has opened its doors. The founders have expressed great ambition for the venture and expect to produce works of lasting significance.',
    ],
];

echo json_encode(['articles' => $articles]);

<?php
declare(strict_types=1);

define('PUWIT_ROOT', dirname(__DIR__) . '/_puwit');

// Strip the /backend sub-path so puwit's router sees /admin/... not /backend/admin/...
$_SERVER['REQUEST_URI'] = preg_replace('#^/backend#', '', $_SERVER['REQUEST_URI']) ?: '/';

require PUWIT_ROOT . '/vendor/autoload.php';

use Puwit\Kernel;

try {
    $kernel = new Kernel();
    $kernel->handle();
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Internal server error']);
}

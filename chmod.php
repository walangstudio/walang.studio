<?php
function fixPerms(string $path): void {
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($items as $item) {
        chmod($item->getPathname(), $item->isDir() ? 0755 : 0644);
    }
    chmod($path, 0755);
}

$root = __DIR__;

// Fix all files and dirs under public_html recursively
$items = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);
foreach ($items as $item) {
    chmod($item->getPathname(), $item->isDir() ? 0755 : 0644);
}
chmod($root, 0755);

unlink(__FILE__);
echo 'done';

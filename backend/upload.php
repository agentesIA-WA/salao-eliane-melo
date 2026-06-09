<?php
require_once 'db.php';

// Max file size: 5MB
$maxSize = 5 * 1024 * 1024;
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$uploadDir = __DIR__ . '/uploads/';

// Ensure uploads directory exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = $_FILES['image']['error'] ?? 'unknown';
    http_response_code(400);
    echo json_encode(['error' => 'Nenhuma imagem enviada ou erro no upload', 'code' => $errorCode]);
    exit;
}

$file = $_FILES['image'];

// Validate file size
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Arquivo muito grande. Tamanho máximo: 5MB']);
    exit;
}

// Validate MIME type
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de arquivo não permitido. Use: JPG, PNG, WebP ou GIF']);
    exit;
}

// Generate unique filename
$extension = match($mimeType) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    default => 'jpg'
};

$filename = 'service_' . uniqid() . '_' . time() . '.' . $extension;
$destination = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    // Return the relative URL path to the uploaded image
    $imageUrl = './backend/uploads/' . $filename;
    
    echo json_encode([
        'success' => true,
        'imageUrl' => $imageUrl,
        'filename' => $filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Falha ao salvar a imagem no servidor']);
}

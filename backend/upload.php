<?php
require_once 'db.php';

// Max file size: 10MB
$maxSize = 10 * 1024 * 1024;
$allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/bmp',
    'image/x-ms-bmp',
    'image/svg+xml'
];
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
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE   => 'A imagem excede o limite configurado no servidor PHP (upload_max_filesize).',
        UPLOAD_ERR_FORM_SIZE  => 'A imagem excede o tamanho máximo permitido pelo formulário.',
        UPLOAD_ERR_PARTIAL    => 'O upload da imagem foi feito apenas parcialmente.',
        UPLOAD_ERR_NO_FILE    => 'Nenhum arquivo de imagem foi enviado.',
        UPLOAD_ERR_NO_TMP_DIR => 'Pasta temporária ausente no servidor.',
        UPLOAD_ERR_CANT_WRITE => 'Falha ao gravar arquivo em disco.',
        UPLOAD_ERR_EXTENSION  => 'Upload interrompido por extensão PHP.'
    ];
    $msg = $errorMessages[$errorCode] ?? 'Nenhuma imagem enviada ou erro no upload';
    http_response_code(400);
    echo json_encode(['error' => $msg, 'code' => $errorCode]);
    exit;
}

$file = $_FILES['image'];

// Validate file size
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Arquivo muito grande. Tamanho máximo: 10MB']);
    exit;
}

// Validate MIME type (with extension fallback for octet-stream)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
$origExt = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
$extToMime = [
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'jfif' => 'image/jpeg',
    'png'  => 'image/png',
    'webp' => 'image/webp',
    'gif'  => 'image/gif',
    'avif' => 'image/avif',
    'bmp'  => 'image/bmp',
    'svg'  => 'image/svg+xml'
];

if ((!in_array($mimeType, $allowedTypes) || $mimeType === 'application/octet-stream') && isset($extToMime[$origExt])) {
    $mimeType = $extToMime[$origExt];
}

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de arquivo não permitido (' . $mimeType . '). Use: JPG, PNG, WebP, AVIF ou GIF']);
    exit;
}

// Generate unique filename
$extension = match($mimeType) {
    'image/jpeg', 'image/jpg', 'image/pjpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'image/avif' => 'avif',
    'image/bmp', 'image/x-ms-bmp' => 'bmp',
    'image/svg+xml' => 'svg',
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
        'fileUrl' => $imageUrl,
        'filename' => $filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Falha ao salvar a imagem no servidor']);
}

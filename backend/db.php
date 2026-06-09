<?php
/**
 * Configuração de Conexão com Banco de Dados
 * Credenciais carregadas de .env (NÃO versionar o .env)
 */

// Carregar variáveis do .env
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue; // Ignorar comentários
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!array_key_exists($key, $_ENV)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

// Headers CORS e Content-Type
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

function getDB() {
    $host = getenv('DB_HOST') ?: 'localhost';
    $name = getenv('DB_NAME') ?: '';
    $user = getenv('DB_USER') ?: '';
    $pass = getenv('DB_PASS') ?: '';

    try {
        $db = new PDO(
            "mysql:host=$host;dbname=$name;charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $db;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Connection failed: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Verifica se a requisição contém um token admin válido.
 * Usado para proteger rotas de escrita (POST/PUT/DELETE) que não sejam de auth.
 */
function requireAdminAuth() {
    $token = getenv('ADMIN_API_TOKEN') ?: '';
    if (empty($token)) return; // Se não configurado, não exige (compatibilidade)

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $providedToken = '';

    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        $providedToken = trim($matches[1]);
    }

    if ($providedToken !== $token) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Invalid or missing admin token']);
        exit;
    }
}

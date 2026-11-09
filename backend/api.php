<?php
require_once 'db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'services':
        handleServices($db, $method);
        break;
    case 'professionals':
        handleProfessionals($db, $method);
        break;
    case 'appointments':
        handleAppointments($db, $method);
        break;
    case 'config':
        handleConfig($db, $method);
        break;
    case 'auth':
        handleAuth($db, $method);
        break;
    case 'clients':
        handleClients($db, $method);
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Action not found']);
        break;
}

// ============================================================
// SERVICES
// ============================================================
function handleServices($db, $method) {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM services");
        echo json_encode($stmt->fetchAll());
    } elseif ($method === 'POST') {
        requireAdminAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        if (!validateServiceData($data)) return;
        $stmt = $db->prepare("INSERT INTO services (id, name, description, durationMinutes, price, imageUrl, observation) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            sanitize($data['id']),
            sanitize($data['name']),
            sanitize($data['description'] ?? ''),
            intval($data['durationMinutes']),
            floatval($data['price']),
            sanitize($data['imageUrl'] ?? ''),
            sanitize($data['observation'] ?? '')
        ]);
        echo json_encode($data);
    } elseif ($method === 'PUT') {
        requireAdminAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = sanitize($_GET['id'] ?? '');
        if (empty($id)) { badRequest('ID é obrigatório'); return; }
        $stmt = $db->prepare("UPDATE services SET name=?, description=?, durationMinutes=?, price=?, imageUrl=?, observation=? WHERE id=?");
        $stmt->execute([
            sanitize($data['name'] ?? ''),
            sanitize($data['description'] ?? ''),
            intval($data['durationMinutes'] ?? 0),
            floatval($data['price'] ?? 0),
            sanitize($data['imageUrl'] ?? ''),
            sanitize($data['observation'] ?? ''),
            $id
        ]);
        echo json_encode($data);
    } elseif ($method === 'DELETE') {
        requireAdminAuth();
        $id = sanitize($_GET['id'] ?? '');
        if (empty($id)) { badRequest('ID é obrigatório'); return; }
        $stmt = $db->prepare("DELETE FROM services WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
}

// ============================================================
// PROFESSIONALS
// ============================================================
function handleProfessionals($db, $method) {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM professionals");
        $professionals = $stmt->fetchAll();
        foreach ($professionals as &$pro) {
            $stmt = $db->prepare("SELECT service_id FROM professional_specialties WHERE professional_id = ?");
            $stmt->execute([$pro['id']]);
            $pro['specialties'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        echo json_encode($professionals);
    } elseif ($method === 'POST') {
        requireAdminAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        if (!validateProfessionalData($data)) return;
        $db->beginTransaction();
        $stmt = $db->prepare("INSERT INTO professionals (id, name, avatarUrl) VALUES (?, ?, ?)");
        $stmt->execute([sanitize($data['id']), sanitize($data['name']), sanitize($data['avatarUrl'] ?? '')]);
        if (!empty($data['specialties']) && is_array($data['specialties'])) {
            foreach ($data['specialties'] as $serviceId) {
                $stmt = $db->prepare("INSERT INTO professional_specialties (professional_id, service_id) VALUES (?, ?)");
                $stmt->execute([sanitize($data['id']), sanitize($serviceId)]);
            }
        }
        $db->commit();
        echo json_encode($data);
    } elseif ($method === 'PUT') {
        requireAdminAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = sanitize($_GET['id'] ?? '');
        if (empty($id)) { badRequest('ID é obrigatório'); return; }
        $db->beginTransaction();
        $stmt = $db->prepare("UPDATE professionals SET name=?, avatarUrl=? WHERE id=?");
        $stmt->execute([sanitize($data['name'] ?? ''), sanitize($data['avatarUrl'] ?? ''), $id]);
        $db->prepare("DELETE FROM professional_specialties WHERE professional_id=?")->execute([$id]);
        if (!empty($data['specialties']) && is_array($data['specialties'])) {
            foreach ($data['specialties'] as $serviceId) {
                $stmt = $db->prepare("INSERT INTO professional_specialties (professional_id, service_id) VALUES (?, ?)");
                $stmt->execute([$id, sanitize($serviceId)]);
            }
        }
        $db->commit();
        echo json_encode($data);
    } elseif ($method === 'DELETE') {
        requireAdminAuth();
        $id = sanitize($_GET['id'] ?? '');
        if (empty($id)) { badRequest('ID é obrigatório'); return; }
        $stmt = $db->prepare("DELETE FROM professionals WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
}

// ============================================================
// APPOINTMENTS
// ============================================================
function handleAppointments($db, $method) {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM appointments ORDER BY date DESC, time DESC");
        echo json_encode($stmt->fetchAll());
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!validateAppointmentData($data)) return;

        // Verificação de conflito de horário
        $conflictStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments WHERE professionalId = ? AND date = ? AND time = ? AND status NOT IN ('Cancelado')"
        );
        $conflictStmt->execute([
            sanitize($data['professionalId']),
            sanitize($data['date']),
            sanitize($data['time'])
        ]);
        if ($conflictStmt->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['error' => 'Conflito: já existe um agendamento neste horário para este profissional.']);
            return;
        }

        $stmt = $db->prepare("INSERT INTO appointments (id, userId, userName, clientPhone, clientEmail, serviceId, professionalId, date, time, status, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            sanitize($data['id']),
            sanitize($data['userId']),
            sanitize($data['userName']),
            sanitize($data['clientPhone'] ?? ''),
            sanitize($data['clientEmail'] ?? ''),
            sanitize($data['serviceId']),
            sanitize($data['professionalId']),
            sanitize($data['date']),
            sanitize($data['time']),
            sanitize($data['status']),
            sanitize($data['observations'] ?? '')
        ]);
        upsertClientFromAppointment($db, $data);
        echo json_encode($data);
    } elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = sanitize($_GET['id'] ?? '');
        if (empty($id)) { badRequest('ID é obrigatório'); return; }

        if (isset($data['status']) && !isset($data['userName'])) {
            // Atualizar apenas o status (admin ou cliente cancelando)
            $validStatuses = ['Agendado', 'Confirmado', 'Em Atendimento', 'Concluído', 'Cancelado'];
            if (!in_array($data['status'], $validStatuses)) {
                badRequest('Status inválido');
                return;
            }
            $stmt = $db->prepare("UPDATE appointments SET status=? WHERE id=?");
            $stmt->execute([sanitize($data['status']), $id]);
        } elseif (isset($data['rating'])) {
            // Adicionar review
            $rating = intval($data['rating']);
            if ($rating < 1 || $rating > 5) { badRequest('Rating deve ser entre 1 e 5'); return; }
            $stmt = $db->prepare("UPDATE appointments SET rating=?, reviewComment=? WHERE id=?");
            $stmt->execute([$rating, sanitize($data['reviewComment'] ?? ''), $id]);
        } else {
            // Atualização completa (admin editando)
            requireAdminAuth();
            
            // Buscar existente para preservar campos como userId que podem não vir no payload
            $checkStmt = $db->prepare("SELECT * FROM appointments WHERE id=?");
            $checkStmt->execute([$id]);
            $existing = $checkStmt->fetch();
            if (!$existing) { badRequest('Agendamento não encontrado'); return; }

            $stmt = $db->prepare("UPDATE appointments SET userId=?, userName=?, clientPhone=?, clientEmail=?, serviceId=?, professionalId=?, date=?, time=?, status=?, observations=? WHERE id=?");
            $stmt->execute([
                sanitize($data['userId'] ?? $existing['userId']),
                sanitize($data['userName'] ?? $existing['userName']),
                sanitize($data['clientPhone'] ?? $existing['clientPhone']),
                sanitize($data['clientEmail'] ?? $existing['clientEmail']),
                sanitize($data['serviceId'] ?? $existing['serviceId']),
                sanitize($data['professionalId'] ?? $existing['professionalId']),
                sanitize($data['date'] ?? $existing['date']),
                sanitize($data['time'] ?? $existing['time']),
                sanitize($data['status'] ?? $existing['status']),
                sanitize($data['observations'] ?? $existing['observations']),
                $id
            ]);
        }
        echo json_encode($data);
    }
}

// ============================================================
// CONFIG
// ============================================================
function handleConfig($db, $method) {
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT config_value FROM business_config WHERE config_key = 'main'");
        $stmt->execute();
        $row = $stmt->fetch();
        echo $row ? $row['config_value'] : json_encode([]);
    } elseif ($method === 'POST') {
        requireAdminAuth();
        $data = file_get_contents('php://input');
        $stmt = $db->prepare("INSERT INTO business_config (config_key, config_value) VALUES ('main', ?) ON DUPLICATE KEY UPDATE config_value = ?");
        $stmt->execute([$data, $data]);
        echo $data;
    }
}

// ============================================================
// AUTH (Login / Password)
// ============================================================
function handleAuth($db, $method) {
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $password = $data['password'] ?? '';
        $authAction = $data['auth_action'] ?? 'verify';

        if ($authAction === 'verify') {
            $stmt = $db->prepare("SELECT password_hash FROM admin_auth WHERE id = 1");
            $stmt->execute();
            $stored = $stmt->fetchColumn();

            // Suporte a legacy (texto puro) e novo (bcrypt)
            if (password_get_info($stored)['algo'] !== null && password_get_info($stored)['algo'] !== 0) {
                // Hash bcrypt: usar password_verify
                $isValid = password_verify($password, $stored);
            } else {
                // Legacy: comparação direta (migrar automaticamente)
                $isValid = ($password === $stored);
                if ($isValid) {
                    // Migrar senha para bcrypt automaticamente
                    $hashed = password_hash($password, PASSWORD_BCRYPT);
                    $updateStmt = $db->prepare("UPDATE admin_auth SET password_hash = ? WHERE id = 1");
                    $updateStmt->execute([$hashed]);
                }
            }

            if ($isValid) {
                $token = getEnvVar('ADMIN_API_TOKEN', '');
                echo json_encode(['success' => true, 'token' => $token]);
            } else {
                echo json_encode(['success' => false]);
            }
        } elseif ($authAction === 'update') {
            requireAdminAuth();
            $newPassword = $data['newPassword'] ?? '';
            if (strlen($newPassword) < 4) {
                badRequest('Senha deve ter no mínimo 4 caracteres');
                return;
            }
            $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE admin_auth SET password_hash = ? WHERE id = 1");
            $stmt->execute([$hashed]);
            echo json_encode(['success' => true]);
        }
    }
}

// ============================================================
// HELPERS: Validação e Sanitização
// ============================================================

function sanitize($value) {
    if ($value === null) return '';
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

function badRequest($message) {
    http_response_code(400);
    echo json_encode(['error' => $message]);
}

function validateServiceData($data) {
    if (empty($data['id']) || empty($data['name'])) {
        badRequest('Campos obrigatórios: id, name');
        return false;
    }
    if (!isset($data['durationMinutes']) || intval($data['durationMinutes']) <= 0) {
        badRequest('durationMinutes deve ser um número positivo');
        return false;
    }
    if (!isset($data['price']) || floatval($data['price']) < 0) {
        badRequest('price deve ser um número não-negativo');
        return false;
    }
    return true;
}

function validateProfessionalData($data) {
    if (empty($data['id']) || empty($data['name'])) {
        badRequest('Campos obrigatórios: id, name');
        return false;
    }
    return true;
}

function validateAppointmentData($data) {
    $required = ['id', 'userId', 'userName', 'serviceId', 'professionalId', 'date', 'time', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            badRequest("Campo obrigatório ausente: $field");
            return false;
        }
    }
    // Validar formato da data
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['date'])) {
        badRequest('Formato de data inválido. Use YYYY-MM-DD');
        return false;
    }
    // Validar formato do horário
    if (!preg_match('/^\d{2}:\d{2}$/', $data['time'])) {
        badRequest('Formato de horário inválido. Use HH:mm');
        return false;
    }
    return true;
}

// ============================================================
// CLIENTS
// ============================================================
function ensureClientsSchema($db) {
    static $checked = false;
    if ($checked || !$db) return;
    $checked = true;
    try {
        $db->exec(
            "CREATE TABLE IF NOT EXISTS `clients` (
                `userId` varchar(50) NOT NULL,
                `name` varchar(255) NOT NULL,
                `phone` varchar(30) DEFAULT '',
                `email` varchar(255) DEFAULT '',
                `observations` text,
                `totalAppointments` int(11) NOT NULL DEFAULT 0,
                `lastVisit` varchar(50) DEFAULT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`userId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $colsStmt = $db->query("SHOW COLUMNS FROM `clients`");
        $existingCols = [];
        foreach ($colsStmt->fetchAll() as $col) {
            if (!empty($col['Field'])) {
                $existingCols[strtolower((string) $col['Field'])] = true;
            }
        }
        if (empty($existingCols['observations'])) {
            $db->exec("ALTER TABLE `clients` ADD COLUMN `observations` TEXT DEFAULT NULL AFTER `email`");
        }

        // Se a tabela clients estiver vazia mas já existirem clientes em appointments, sincroniza automaticamente
        $clientCount = (int) $db->query("SELECT COUNT(*) FROM `clients`")->fetchColumn();
        if ($clientCount === 0) {
            syncClientsFromAppointments($db);
        }
    } catch (Throwable $e) {
        error_log('[ensureClientsSchema] ' . $e->getMessage());
    }
}

function syncClientsFromAppointments($db) {
    try {
        $apts = $db->query("SELECT userId, userName, clientPhone, clientEmail, date, time, status FROM appointments ORDER BY date ASC, time ASC")->fetchAll();
        if (empty($apts)) return;

        $map = [];
        $usedIds = [];
        foreach ($apts as $a) {
            $name = trim((string) ($a['userName'] ?? ''));
            if ($name === '') continue;
            $phone = trim((string) ($a['clientPhone'] ?? ''));
            $digits = preg_replace('/\D+/', '', $phone);
            $email = trim((string) ($a['clientEmail'] ?? ''));
            if (stripos($email, 'guest_') === 0 || stripos($email, '@salao.local') !== false) {
                $email = '';
            }
            $statusRaw = trim((string) ($a['status'] ?? ''));
            $statusLower = function_exists('mb_strtolower') ? mb_strtolower($statusRaw, 'UTF-8') : strtolower($statusRaw);
            $isCancelled = in_array($statusLower, ['cancelado', 'cancelada', 'cancelled'], true);

            $isDummyPhone = ($digits === '' || preg_match('/9{6,}/', $digits));
            $nameKey = function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
            $key = $nameKey;

            $visit = !$isCancelled ? trim(($a['date'] ?? '') . ' ' . ($a['time'] ?? '')) : '';
            if (!isset($map[$key])) {
                $uid = trim((string) ($a['userId'] ?? ''));
                if ($uid === '' || isset($usedIds[$uid])) {
                    $uid = 'cli-' . substr(md5($key), 0, 16);
                }
                $usedIds[$uid] = true;
                $map[$key] = [
                    'userId' => $uid,
                    'name' => $name,
                    'phone' => $phone,
                    'email' => $email,
                    'totalAppointments' => $isCancelled ? 0 : 1,
                    'lastVisit' => $visit,
                ];
            } else {
                if (!$isCancelled) {
                    $map[$key]['totalAppointments']++;
                    if ($visit > $map[$key]['lastVisit']) {
                        $map[$key]['lastVisit'] = $visit;
                    }
                }
                if ($phone !== '' && !$isDummyPhone) {
                    $map[$key]['phone'] = $phone;
                }
                if ($email !== '') {
                    $map[$key]['email'] = $email;
                }
            }
        }

        if (!empty($map)) {
            $placeholders = [];
            $values = [];
            foreach ($map as $c) {
                $placeholders[] = '(?, ?, ?, ?, NULL, ?, ?)';
                $values[] = $c['userId'];
                $values[] = $c['name'];
                $values[] = $c['phone'];
                $values[] = $c['email'];
                $values[] = $c['totalAppointments'];
                $values[] = $c['lastVisit'] !== '' ? $c['lastVisit'] : null;
            }
            $sql = "INSERT IGNORE INTO `clients` (`userId`, `name`, `phone`, `email`, `observations`, `totalAppointments`, `lastVisit`) VALUES " . implode(', ', $placeholders);
            $insertStmt = $db->prepare($sql);
            $insertStmt->execute($values);
        }
    } catch (Throwable $e) {
        error_log('[syncClientsFromAppointments] ' . $e->getMessage());
    }
}

function upsertClientFromAppointment($db, $data) {
    try {
        ensureClientsSchema($db);
        $name = sanitize($data['userName'] ?? '');
        if ($name === '') return;
        $phone = sanitize($data['clientPhone'] ?? '');
        $email = sanitize($data['clientEmail'] ?? '');
        if (stripos($email, 'guest_') === 0 || stripos($email, '@salao.local') !== false) {
            $email = '';
        }
        $statusRaw = trim((string) ($data['status'] ?? ''));
        $statusLower = function_exists('mb_strtolower') ? mb_strtolower($statusRaw, 'UTF-8') : strtolower($statusRaw);
        $isCancelled = in_array($statusLower, ['cancelado', 'cancelada', 'cancelled'], true);
        $visit = !$isCancelled ? trim(sanitize($data['date'] ?? '') . ' ' . sanitize($data['time'] ?? '')) : '';

        $checkStmt = $db->prepare(
            "SELECT userId, totalAppointments, lastVisit FROM clients
             WHERE (phone <> '' AND phone = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)))
                OR LOWER(TRIM(name)) = LOWER(TRIM(?))
             LIMIT 1"
        );
        $checkStmt->execute([$phone, $name, $name]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            if (!$isCancelled) {
                $newTotal = ((int) $existing['totalAppointments']) + 1;
                $newLastVisit = ($visit !== '' && $visit > (string) $existing['lastVisit']) ? $visit : $existing['lastVisit'];
                $upd = $db->prepare("UPDATE clients SET totalAppointments = ?, lastVisit = ? WHERE userId = ?");
                $upd->execute([$newTotal, $newLastVisit, $existing['userId']]);
            }
        } else {
            $uid = !empty($data['userId']) ? sanitize($data['userId']) : ('cli-' . bin2hex(random_bytes(8)));
            $ins = $db->prepare(
                "INSERT IGNORE INTO clients (userId, name, phone, email, observations, totalAppointments, lastVisit)
                 VALUES (?, ?, ?, ?, NULL, ?, ?)"
            );
            $ins->execute([$uid, $name, $phone, $email, $isCancelled ? 0 : 1, $visit !== '' ? $visit : null]);
        }
    } catch (Throwable $e) {
        error_log('[upsertClientFromAppointment] ' . $e->getMessage());
    }
}

function handleClients($db, $method) {
    ensureClientsSchema($db);
    if ($method === 'GET') {
        $stmt = $db->query(
            "SELECT
                c.userId,
                c.name,
                c.phone,
                c.email,
                c.observations,
                COALESCE(agg.cnt, 0) AS totalAppointments,
                COALESCE(agg.maxVisit, '') AS lastVisit
             FROM clients c
             LEFT JOIN (
                SELECT
                    LOWER(TRIM(userName)) AS normName,
                    COUNT(*) AS cnt,
                    MAX(CONCAT(date, ' ', time)) AS maxVisit
                FROM appointments
                WHERE TRIM(COALESCE(userName, '')) <> ''
                  AND LOWER(TRIM(COALESCE(status, ''))) NOT IN ('cancelado', 'cancelada', 'cancelled')
                GROUP BY LOWER(TRIM(userName))
             ) agg ON agg.normName = LOWER(TRIM(c.name))
             ORDER BY c.name ASC"
        );
        $rows = $stmt->fetchAll();
        $clients = [];
        foreach ($rows as $row) {
            $clients[] = [
                'userId' => $row['userId'],
                'name' => $row['name'] ?? '',
                'phone' => $row['phone'] ?? '',
                'email' => $row['email'] ?? '',
                'observations' => $row['observations'] ?? '',
                'totalAppointments' => (int) ($row['totalAppointments'] ?? 0),
                'lastVisit' => $row['lastVisit'] ?? '',
            ];
        }
        echo json_encode(array_values($clients));
    } elseif ($method === 'POST') {
        requireAdminAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = sanitize($data['name'] ?? '');
        if ($name === '') {
            badRequest('Nome do cliente é obrigatório');
            return;
        }
        $userId = !empty($data['id']) ? sanitize($data['id']) : ('cli-' . bin2hex(random_bytes(8)));
        $phone = sanitize($data['phone'] ?? '');
        $email = sanitize($data['email'] ?? '');
        $observations = sanitize($data['observations'] ?? '');

        $stmt = $db->prepare(
            "INSERT INTO clients (userId, name, phone, email, observations, totalAppointments, lastVisit)
             VALUES (?, ?, ?, ?, ?, 0, NULL)"
        );
        $stmt->execute([$userId, $name, $phone, $email, $observations]);
        echo json_encode([
            'success' => true,
            'userId' => $userId,
            'id' => $userId,
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'observations' => $observations,
            'totalAppointments' => 0,
            'lastVisit' => '',
        ]);
    } elseif ($method === 'PUT') {
        requireAdminAuth();
        $id = sanitize($_GET['id'] ?? '');
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = sanitize($data['name'] ?? '');
        if ($id === '' || $name === '') {
            badRequest('ID e nome do cliente são obrigatórios');
            return;
        }
        $phone = sanitize($data['phone'] ?? '');
        $email = sanitize($data['email'] ?? '');
        $observations = sanitize($data['observations'] ?? '');

        $stmt = $db->prepare("UPDATE clients SET name=?, phone=?, email=?, observations=? WHERE userId=?");
        $stmt->execute([$name, $phone, $email, $observations, $id]);
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        requireAdminAuth();
        $id = sanitize($_GET['id'] ?? '');
        if ($id === '') {
            badRequest('ID do cliente é obrigatório');
            return;
        }
        $stmt = $db->prepare("DELETE FROM clients WHERE userId=?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
}

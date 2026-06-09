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

        $stmt = $db->prepare("INSERT INTO appointments (id, userId, userName, clientPhone, clientEmail, serviceId, professionalId, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
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
            sanitize($data['status'])
        ]);
        echo json_encode($data);
    } elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = sanitize($_GET['id'] ?? '');
        if (empty($id)) { badRequest('ID é obrigatório'); return; }

        if (isset($data['status'])) {
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
            $stmt = $db->prepare("UPDATE appointments SET userId=?, userName=?, clientPhone=?, clientEmail=?, serviceId=?, professionalId=?, date=?, time=?, status=? WHERE id=?");
            $stmt->execute([
                sanitize($data['userId'] ?? ''),
                sanitize($data['userName'] ?? ''),
                sanitize($data['clientPhone'] ?? ''),
                sanitize($data['clientEmail'] ?? ''),
                sanitize($data['serviceId'] ?? ''),
                sanitize($data['professionalId'] ?? ''),
                sanitize($data['date'] ?? ''),
                sanitize($data['time'] ?? ''),
                sanitize($data['status'] ?? ''),
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
                $token = getenv('ADMIN_API_TOKEN') ?: '';
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

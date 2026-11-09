-- =====================================================================
-- Migração Manual: Cadastro de Clientes e Campo de Observações
-- Pode ser executada no phpMyAdmin, DBeaver ou via terminal MySQL.
-- Script idempotente (cria a tabela clients se não existir e adiciona
-- a coluna observations apenas se ainda não existir).
-- =====================================================================

-- 1. Garantir existência da tabela clients
CREATE TABLE IF NOT EXISTS `clients` (
  `userId` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT '',
  `email` varchar(255) DEFAULT '',
  `observations` text DEFAULT NULL,
  `totalAppointments` int(11) NOT NULL DEFAULT 0,
  `lastVisit` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Adicionar coluna observations na tabela clients (caso a tabela já existisse sem ela)
SET @add_client_observations_sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'clients'
     AND COLUMN_NAME = 'observations') = 0,
  'ALTER TABLE `clients` ADD COLUMN `observations` TEXT DEFAULT NULL AFTER `email`',
  'SET @migration_noop = 1'
);
PREPARE stmt_add_client_observations FROM @add_client_observations_sql;
EXECUTE stmt_add_client_observations;
DEALLOCATE PREPARE stmt_add_client_observations;

-- 3. Importar clientes existentes da tabela appointments para a tabela clients (idempotente, ignorando cancelados na contagem)
INSERT IGNORE INTO `clients` (`userId`, `name`, `phone`, `email`, `observations`, `totalAppointments`, `lastVisit`)
SELECT
  COALESCE(NULLIF(TRIM(a.userId), ''), CONCAT('cli-', SUBSTRING(MD5(CONCAT(LOWER(TRIM(a.userName)), '|', COALESCE(a.clientPhone, ''))), 1, 16))) AS userId,
  TRIM(a.userName) AS name,
  MAX(COALESCE(a.clientPhone, '')) AS phone,
  MAX(CASE
    WHEN a.clientEmail LIKE 'guest_%' OR a.clientEmail LIKE '%@salao.local%' THEN ''
    ELSE COALESCE(a.clientEmail, '')
  END) AS email,
  NULL AS observations,
  SUM(CASE WHEN LOWER(TRIM(COALESCE(a.status, ''))) NOT IN ('cancelado', 'cancelada', 'cancelled') THEN 1 ELSE 0 END) AS totalAppointments,
  MAX(CASE WHEN LOWER(TRIM(COALESCE(a.status, ''))) NOT IN ('cancelado', 'cancelada', 'cancelled') THEN CONCAT(a.date, ' ', a.time) ELSE NULL END) AS lastVisit
FROM `appointments` a
WHERE TRIM(COALESCE(a.userName, '')) <> ''
GROUP BY LOWER(TRIM(a.userName)), COALESCE(a.clientPhone, '');


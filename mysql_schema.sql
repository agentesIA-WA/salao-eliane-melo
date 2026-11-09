-- Esquema do Banco de Dados para Salão Eliane Melo
-- Compatível com MySQL (Locaweb)

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS `services` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `durationMinutes` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `imageUrl` text,
  `observation` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Profissionais
CREATE TABLE IF NOT EXISTS `professionals` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatarUrl` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Especialidades (Relacionamento Profissional x Serviço)
CREATE TABLE IF NOT EXISTS `professional_specialties` (
  `professional_id` varchar(50) NOT NULL,
  `service_id` varchar(50) NOT NULL,
  PRIMARY KEY (`professional_id`, `service_id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` varchar(50) NOT NULL,
  `userId` varchar(50) NOT NULL,
  `userName` varchar(255) NOT NULL,
  `clientPhone` varchar(20),
  `clientEmail` varchar(255),
  `serviceId` varchar(50) NOT NULL,
  `professionalId` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `time` varchar(10) NOT NULL,
  `status` varchar(50) NOT NULL,
  `rating` int(11),
  `observations` text,
  `reviewComment` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Configurações do Negócio
CREATE TABLE IF NOT EXISTS `business_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) NOT NULL,
  `config_value` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Senha Admin
CREATE TABLE IF NOT EXISTS `admin_auth` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `password_hash` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS `clients` (
  `userId` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT '',
  `email` varchar(255) DEFAULT '',
  `observations` text,
  `totalAppointments` int(11) NOT NULL DEFAULT 0,
  `lastVisit` varchar(50) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dados iniciais
INSERT IGNORE INTO `admin_auth` (`id`, `password_hash`) VALUES (1, '123456');

COMMIT;

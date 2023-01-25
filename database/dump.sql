-- MySQL dump 10.13  Distrib 5.7.34, for linux-glibc2.12 (x86_64)
--
-- Host: 192.168.0.19    Database: acme
-- ------------------------------------------------------
-- Server version	5.7.38

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- -----------------------------------------------------
-- Table `system`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `system` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'The Id For The Producer',
  `class` VARCHAR(45) NOT NULL COMMENT '\'The class of the system (producer or consumer)\'',
  `identifier` VARCHAR(75) NOT NULL COMMENT 'Auto generated column, lower case name',
  `name` VARCHAR(45) NOT NULL COMMENT 'The name of the system',
  `type` VARCHAR(45) NOT NULL COMMENT 'What type of producer it is? (Microservice, ERP, CRM, CRS, etc)',
  `description` TINYTEXT NOT NULL COMMENT 'A short description for the producer',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_id` INT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idProducer_UNIQUE` (`id` ASC),
  UNIQUE INDEX `indifier_UNIQUE` (`identifier` ASC),
  UNIQUE INDEX `client_id_UNIQUE` (`client_id` ASC)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `event`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `event` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `system_id` INT UNSIGNED NOT NULL,
  `identifier` VARCHAR(75) NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` VARCHAR(45) NOT NULL COMMENT 'A name for the event',
  `operation` VARCHAR(25) NOT NULL COMMENT 'What operation does the event represents (select, new,update, delete, process) ',
  `description` TINYTEXT NOT NULL COMMENT 'A short description for the event',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idProducer_Event_UNIQUE` (`id` ASC),
  UNIQUE INDEX `identifier_UNIQUE` (`identifier` ASC),
  INDEX `fk_event_system1_idx` (`system_id` ASC),
  CONSTRAINT `fk_event_system1`
    FOREIGN KEY (`system_id`)
    REFERENCES `system` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `action`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `action` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `system_id` INT UNSIGNED NOT NULL,
  `identifier` VARCHAR(75) NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` VARCHAR(45) NOT NULL COMMENT 'A name for the action',
  `http_configuration` MEDIUMTEXT NOT NULL COMMENT 'An http configuration that should resamblace axios config',
  `operation` VARCHAR(25) NOT NULL COMMENT 'What operation does the action represents (select, new,update, delete, process) ',
  `description` TINYTEXT NOT NULL COMMENT 'A short description for the action',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `identifier_UNIQUE` (`identifier` ASC),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC),
  INDEX `fk_action_system1_idx` (`system_id` ASC),
  CONSTRAINT `fk_action_system1`
    FOREIGN KEY (`system_id`)
    REFERENCES `system` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `action_security`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `action_security` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `action_id` INT UNSIGNED NOT NULL,
  `type` VARCHAR(45) NOT NULL COMMENT 'What type of security does the action has',
  `http_configuration` MEDIUMTEXT NULL COMMENT 'An http configuration that should resamblace axios config for oauth2 spec.',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idAction_Security_UNIQUE` (`id` ASC),
  INDEX `fk_action_security_action1_idx` (`action_id` ASC),
  CONSTRAINT `fk_action_security_action1`
    FOREIGN KEY (`action_id`)
    REFERENCES `action` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `contract`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `contract` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `action_id` INT UNSIGNED NOT NULL,
  `event_id` INT UNSIGNED NOT NULL COMMENT 'The id of the event that the contract is listening',
  `identifier` VARCHAR(75) NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` VARCHAR(45) NOT NULL COMMENT 'A name for the contract',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Is the contract currently active?',
  `order` SMALLINT UNSIGNED NULL DEFAULT 0,
  `deleted` TINYINT(1) NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `mail_recipients_on_error` VARCHAR(100) DEFAULT NULL COMMENT 'Mail of people who will receive the mail when there is an error at the time of executing the contract',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC),
  INDEX `fk_contract_event1_idx` (`event_id` ASC),
  UNIQUE INDEX `identifier_UNIQUE` (`identifier` ASC),
  INDEX `fk_contract_action1_idx` (`action_id` ASC),
  CONSTRAINT `fk_contract_event1`
    FOREIGN KEY (`event_id`)
    REFERENCES `event` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_contract_action1`
    FOREIGN KEY (`action_id`)
    REFERENCES `action` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `variable`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `variable` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(300) NOT NULL,
  `name` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `received_event`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `received_event` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `event_id` INT UNSIGNED NOT NULL COMMENT 'The id of the event',
  `received_request` MEDIUMTEXT NOT NULL COMMENT 'The header of the request event',
  `received_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When was the event recived',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC),
  INDEX `fk_recived_event_event1_idx` (`event_id` ASC),
  CONSTRAINT `fk_recived_event_event1`
    FOREIGN KEY (`event_id`)
    REFERENCES `event` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `contract_exc_detail`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `contract_exc_detail` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `contract_id` INT UNSIGNED NOT NULL,
  `received_event_id` INT UNSIGNED NOT NULL,
  `state` VARCHAR(15) NOT NULL COMMENT 'What satate the contract is at? (ERROR, PROCESSING, COMPLETED)',
  `attempts` INT DEFAULT 0 COMMENT 'Accumulated execution retries of contract - event',
  `is_aborted` BOOLEAN DEFAULT false COMMENT 'Column to know if contract_exc_detail was aborted',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC),
  INDEX `fk_contract_exc_detail_recived_event1_idx` (`received_event_id` ASC),
  INDEX `fk_contract_exc_detail_contract1_idx` (`contract_id` ASC),
  CONSTRAINT `fk_contract_exc_detail_recived_event1`
    FOREIGN KEY (`received_event_id`)
    REFERENCES `received_event` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_contract_exc_detail_contract1`
    FOREIGN KEY (`contract_id`)
    REFERENCES `contract` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


-- -----------------------------------------------------
-- Table `contract_exc_try`
-- -----------------------------------------------------
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `contract_exc_try` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contract_exc_detail_id` INT UNSIGNED NOT NULL,
  `request` MEDIUMTEXT NOT NULL COMMENT 'The header of the request event',
  `response` MEDIUMTEXT NOT NULL COMMENT 'The header of the request event',
  `state` VARCHAR(15) NOT NULL COMMENT 'What satate the contract is at? (ERROR, PROCESSING, COMPLETED)',
  `finished_at` TIMESTAMP NULL COMMENT 'When was the contract executed',
  `executed_at` TIMESTAMP NULL COMMENT 'When was the contract executed',
  `attempts` INT DEFAULT 0 COMMENT 'Accumulated execution retries of contract - event',
  `is_aborted` BOOLEAN DEFAULT false COMMENT 'Column to know if contract_exc_try was aborted',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `id_UNIQUE` (`id` ASC),
  INDEX `fk_contract_exc_try_contract_exc_detail1_idx` (`contract_exc_detail_id` ASC),
  CONSTRAINT `fk_contract_exc_try_contract_exc_detail1`
    FOREIGN KEY (`contract_exc_detail_id`)
    REFERENCES `contract_exc_detail` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'acme'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-09-22 10:34:05

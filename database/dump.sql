-- MySQL dump 10.13  Distrib 5.7.17, for Linux (x86_64)
--
-- Host: localhost    Database: eventhos
-- ------------------------------------------------------
-- Server version	5.7.17

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

--
-- Table structure for table `OAUTH2_ApplicationResource`
--

DROP TABLE IF EXISTS `OAUTH2_ApplicationResource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_ApplicationResource` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `resourceIdentifier` varchar(100) NOT NULL,
  `applications_id` int(10) unsigned NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_applicationresource_resourceidentifier_id_unique` (`resourceIdentifier`,`id`),
  KEY `oauth2_applicationresource_applications_id_foreign` (`applications_id`),
  CONSTRAINT `oauth2_applicationresource_applications_id_foreign` FOREIGN KEY (`applications_id`) REFERENCES `OAUTH2_Applications` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Applications`
--

DROP TABLE IF EXISTS `OAUTH2_Applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Applications` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(100) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_applications_identifier_unique` (`identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Clients`
--

DROP TABLE IF EXISTS `OAUTH2_Clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Clients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` varchar(60) NOT NULL,
  `subject_id` int(10) unsigned NOT NULL,
  `client_secret` varchar(175) NOT NULL,
  `identifier` varchar(100) NOT NULL,
  `access_token` varchar(255) DEFAULT NULL,
  `revoked` tinyint(1) DEFAULT '0',
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_clients_client_id_unique` (`client_id`),
  UNIQUE KEY `oauth2_clients_identifier_unique` (`identifier`),
  KEY `oauth2_clients_subject_id_foreign` (`subject_id`),
  CONSTRAINT `oauth2_clients_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `OAUTH2_Subjects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Permissions`
--

DROP TABLE IF EXISTS `OAUTH2_Permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Permissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `allowed` varchar(75) NOT NULL,
  `applicationResource_id` int(10) unsigned NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `oauth2_permissions_applicationresource_id_foreign` (`applicationResource_id`),
  CONSTRAINT `oauth2_permissions_applicationresource_id_foreign` FOREIGN KEY (`applicationResource_id`) REFERENCES `OAUTH2_ApplicationResource` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_RolePermission`
--

DROP TABLE IF EXISTS `OAUTH2_RolePermission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_RolePermission` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `permissions_id` int(10) unsigned NOT NULL,
  `roles_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_rolepermission_permissions_id_roles_id_unique` (`permissions_id`,`roles_id`),
  KEY `oauth2_rolepermission_roles_id_foreign` (`roles_id`),
  CONSTRAINT `oauth2_rolepermission_permissions_id_foreign` FOREIGN KEY (`permissions_id`) REFERENCES `OAUTH2_Permissions` (`id`),
  CONSTRAINT `oauth2_rolepermission_roles_id_foreign` FOREIGN KEY (`roles_id`) REFERENCES `OAUTH2_Roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Roles`
--

DROP TABLE IF EXISTS `OAUTH2_Roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(100) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_roles_identifier_unique` (`identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_SubjectRole`
--

DROP TABLE IF EXISTS `OAUTH2_SubjectRole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_SubjectRole` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` int(10) unsigned NOT NULL,
  `roles_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_subjectrole_subject_id_roles_id_unique` (`subject_id`,`roles_id`),
  KEY `oauth2_subjectrole_roles_id_foreign` (`roles_id`),
  CONSTRAINT `oauth2_subjectrole_roles_id_foreign` FOREIGN KEY (`roles_id`) REFERENCES `OAUTH2_Roles` (`id`),
  CONSTRAINT `oauth2_subjectrole_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `OAUTH2_Subjects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Subjects`
--

DROP TABLE IF EXISTS `OAUTH2_Subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Subjects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `description` varchar(255) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Users`
--

DROP TABLE IF EXISTS `OAUTH2_Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` int(10) unsigned NOT NULL,
  `username` varchar(45) NOT NULL,
  `password` varchar(75) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_users_username_unique` (`username`),
  KEY `oauth2_users_subject_id_foreign` (`subject_id`),
  CONSTRAINT `oauth2_users_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `OAUTH2_Subjects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `action`
---- MySQL dump 10.13  Distrib 5.7.17, for Linux (x86_64)
--
-- Host: localhost    Database: eventhos
-- ------------------------------------------------------
-- Server version	5.7.17

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

--
-- Table structure for table `OAUTH2_ApplicationResource`
--

DROP TABLE IF EXISTS `OAUTH2_ApplicationResource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_ApplicationResource` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `resourceIdentifier` varchar(100) NOT NULL,
  `applications_id` int(10) unsigned NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_applicationresource_resourceidentifier_id_unique` (`resourceIdentifier`,`id`),
  KEY `oauth2_applicationresource_applications_id_foreign` (`applications_id`),
  CONSTRAINT `oauth2_applicationresource_applications_id_foreign` FOREIGN KEY (`applications_id`) REFERENCES `OAUTH2_Applications` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Applications`
--

DROP TABLE IF EXISTS `OAUTH2_Applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Applications` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(100) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_applications_identifier_unique` (`identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Clients`
--

DROP TABLE IF EXISTS `OAUTH2_Clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Clients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` varchar(60) NOT NULL,
  `subject_id` int(10) unsigned NOT NULL,
  `client_secret` varchar(175) NOT NULL,
  `identifier` varchar(100) NOT NULL,
  `access_token` varchar(255) DEFAULT NULL,
  `revoked` tinyint(1) DEFAULT '0',
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_clients_client_id_unique` (`client_id`),
  UNIQUE KEY `oauth2_clients_identifier_unique` (`identifier`),
  KEY `oauth2_clients_subject_id_foreign` (`subject_id`),
  CONSTRAINT `oauth2_clients_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `OAUTH2_Subjects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Permissions`
--

DROP TABLE IF EXISTS `OAUTH2_Permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Permissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `allowed` varchar(75) NOT NULL,
  `applicationResource_id` int(10) unsigned NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `oauth2_permissions_applicationresource_id_foreign` (`applicationResource_id`),
  CONSTRAINT `oauth2_permissions_applicationresource_id_foreign` FOREIGN KEY (`applicationResource_id`) REFERENCES `OAUTH2_ApplicationResource` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_RolePermission`
--

DROP TABLE IF EXISTS `OAUTH2_RolePermission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_RolePermission` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `permissions_id` int(10) unsigned NOT NULL,
  `roles_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_rolepermission_permissions_id_roles_id_unique` (`permissions_id`,`roles_id`),
  KEY `oauth2_rolepermission_roles_id_foreign` (`roles_id`),
  CONSTRAINT `oauth2_rolepermission_permissions_id_foreign` FOREIGN KEY (`permissions_id`) REFERENCES `OAUTH2_Permissions` (`id`),
  CONSTRAINT `oauth2_rolepermission_roles_id_foreign` FOREIGN KEY (`roles_id`) REFERENCES `OAUTH2_Roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Roles`
--

DROP TABLE IF EXISTS `OAUTH2_Roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(100) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_roles_identifier_unique` (`identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_SubjectRole`
--

DROP TABLE IF EXISTS `OAUTH2_SubjectRole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_SubjectRole` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` int(10) unsigned NOT NULL,
  `roles_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_subjectrole_subject_id_roles_id_unique` (`subject_id`,`roles_id`),
  KEY `oauth2_subjectrole_roles_id_foreign` (`roles_id`),
  CONSTRAINT `oauth2_subjectrole_roles_id_foreign` FOREIGN KEY (`roles_id`) REFERENCES `OAUTH2_Roles` (`id`),
  CONSTRAINT `oauth2_subjectrole_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `OAUTH2_Subjects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Subjects`
--

DROP TABLE IF EXISTS `OAUTH2_Subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Subjects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `description` varchar(255) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OAUTH2_Users`
--

DROP TABLE IF EXISTS `OAUTH2_Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `OAUTH2_Users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` int(10) unsigned NOT NULL,
  `username` varchar(45) NOT NULL,
  `password` varchar(75) NOT NULL,
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth2_users_username_unique` (`username`),
  KEY `oauth2_users_subject_id_foreign` (`subject_id`),
  CONSTRAINT `oauth2_users_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `OAUTH2_Subjects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `action`
--

DROP TABLE IF EXISTS `action`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `action` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `system_id` int(10) unsigned NOT NULL,
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A name for the action',
  `http_configuration` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'An http configuration that should resamblace axios config',
  `operation` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What operation does the action represents (select, new,update, delete, process) ',
  `description` tinytext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A short description for the action',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identifier_UNIQUE` (`identifier`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_action_system1_idx` (`system_id`),
  CONSTRAINT `fk_action_system1` FOREIGN KEY (`system_id`) REFERENCES `system` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `action_security`
--

DROP TABLE IF EXISTS `action_security`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `action_security` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `action_id` int(10) unsigned NOT NULL,
  `type` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What type of security does the action has',
  `http_configuration` mediumtext COLLATE utf8mb4_unicode_ci COMMENT 'An http configuration that should resamblace axios config for oauth2 spec.',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idAction_Security_UNIQUE` (`id`),
  KEY `fk_action_security_action1_idx` (`action_id`),
  CONSTRAINT `fk_action_security_action1` FOREIGN KEY (`action_id`) REFERENCES `action` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract`
--

DROP TABLE IF EXISTS `contract`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contract` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `action_id` int(10) unsigned NOT NULL,
  `event_id` int(10) unsigned NOT NULL COMMENT 'The id of the event that the contract is listening',
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A name for the contract',
  `active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Is the contract currently active?',
  `order` smallint(5) unsigned DEFAULT '0',
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `mail_recipients_on_error` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mail of people who will receive the mail when there is an error at the time of executing the contract',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  UNIQUE KEY `identifier_UNIQUE` (`identifier`),
  KEY `fk_contract_event1_idx` (`event_id`),
  KEY `fk_contract_action1_idx` (`action_id`),
  CONSTRAINT `fk_contract_action1` FOREIGN KEY (`action_id`) REFERENCES `action` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_contract_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_exc_detail`
--

DROP TABLE IF EXISTS `contract_exc_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contract_exc_detail` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `contract_id` int(10) unsigned NOT NULL,
  `received_event_id` int(10) unsigned NOT NULL,
  `state` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What satate the contract is at? (ERROR, PROCESSING, COMPLETED)',
  `attempts` int(11) DEFAULT '0' COMMENT 'Accumulated execution retries of contract - event',
  `is_aborted` tinyint(1) DEFAULT '0' COMMENT 'Column to know if contract_exc_detail was aborted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_contract_exc_detail_recived_event1_idx` (`received_event_id`),
  KEY `fk_contract_exc_detail_contract1_idx` (`contract_id`),
  CONSTRAINT `fk_contract_exc_detail_contract1` FOREIGN KEY (`contract_id`) REFERENCES `contract` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_contract_exc_detail_recived_event1` FOREIGN KEY (`received_event_id`) REFERENCES `received_event` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_exc_try`
--

DROP TABLE IF EXISTS `contract_exc_try`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contract_exc_try` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `contract_exc_detail_id` int(10) unsigned NOT NULL,
  `request` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The header of the request event',
  `response` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The header of the request event',
  `state` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What satate the contract is at? (ERROR, PROCESSING, COMPLETED)',
  `finished_at` timestamp NULL DEFAULT NULL COMMENT 'When was the contract executed',
  `executed_at` timestamp NULL DEFAULT NULL COMMENT 'When was the contract executed',
  `attempts` int(11) DEFAULT '0' COMMENT 'Accumulated execution retries of contract - event',
  `is_aborted` tinyint(1) DEFAULT '0' COMMENT 'Column to know if contract_exc_try was aborted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_contract_exc_try_contract_exc_detail1_idx` (`contract_exc_detail_id`),
  CONSTRAINT `fk_contract_exc_try_contract_exc_detail1` FOREIGN KEY (`contract_exc_detail_id`) REFERENCES `contract_exc_detail` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event`
--

DROP TABLE IF EXISTS `event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `system_id` int(10) unsigned NOT NULL,
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A name for the event',
  `operation` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What operation does the event represents (select, new,update, delete, process) ',
  `description` tinytext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A short description for the event',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idProducer_Event_UNIQUE` (`id`),
  UNIQUE KEY `identifier_UNIQUE` (`identifier`),
  KEY `fk_event_system1_idx` (`system_id`),
  CONSTRAINT `fk_event_system1` FOREIGN KEY (`system_id`) REFERENCES `system` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `received_event`
--

DROP TABLE IF EXISTS `received_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `received_event` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `event_id` int(10) unsigned NOT NULL COMMENT 'The id of the event',
  `received_request` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The header of the request event',
  `received_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When was the event recived',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_recived_event_event1_idx` (`event_id`),
  CONSTRAINT `fk_recived_event_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system`
--

DROP TABLE IF EXISTS `system`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The Id For The Producer',
  `class` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '''The class of the system (producer or consumer)''',
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The name of the system',
  `type` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What type of producer it is? (Microservice, ERP, CRM, CRS, etc)',
  `description` tinytext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A short description for the producer',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idProducer_UNIQUE` (`id`),
  UNIQUE KEY `indifier_UNIQUE` (`identifier`),
  UNIQUE KEY `client_id_UNIQUE` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `variable`
--

DROP TABLE IF EXISTS `variable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `variable` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-02-22  0:43:44


DROP TABLE IF EXISTS `action`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `action` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `system_id` int(10) unsigned NOT NULL,
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A name for the action',
  `http_configuration` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'An http configuration that should resamblace axios config',
  `operation` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What operation does the action represents (select, new,update, delete, process) ',
  `description` tinytext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A short description for the action',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identifier_UNIQUE` (`identifier`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_action_system1_idx` (`system_id`),
  CONSTRAINT `fk_action_system1` FOREIGN KEY (`system_id`) REFERENCES `system` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `action_security`
--

DROP TABLE IF EXISTS `action_security`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `action_security` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `action_id` int(10) unsigned NOT NULL,
  `type` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What type of security does the action has',
  `http_configuration` mediumtext COLLATE utf8mb4_unicode_ci COMMENT 'An http configuration that should resamblace axios config for oauth2 spec.',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idAction_Security_UNIQUE` (`id`),
  KEY `fk_action_security_action1_idx` (`action_id`),
  CONSTRAINT `fk_action_security_action1` FOREIGN KEY (`action_id`) REFERENCES `action` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract`
--

DROP TABLE IF EXISTS `contract`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contract` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `action_id` int(10) unsigned NOT NULL,
  `event_id` int(10) unsigned NOT NULL COMMENT 'The id of the event that the contract is listening',
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A name for the contract',
  `active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Is the contract currently active?',
  `order` smallint(5) unsigned DEFAULT '0',
  `deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `mail_recipients_on_error` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mail of people who will receive the mail when there is an error at the time of executing the contract',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  UNIQUE KEY `identifier_UNIQUE` (`identifier`),
  KEY `fk_contract_event1_idx` (`event_id`),
  KEY `fk_contract_action1_idx` (`action_id`),
  CONSTRAINT `fk_contract_action1` FOREIGN KEY (`action_id`) REFERENCES `action` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_contract_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_exc_detail`
--

DROP TABLE IF EXISTS `contract_exc_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contract_exc_detail` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `contract_id` int(10) unsigned NOT NULL,
  `received_event_id` int(10) unsigned NOT NULL,
  `state` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What satate the contract is at? (ERROR, PROCESSING, COMPLETED)',
  `attempts` int(11) DEFAULT '0' COMMENT 'Accumulated execution retries of contract - event',
  `is_aborted` tinyint(1) DEFAULT '0' COMMENT 'Column to know if contract_exc_detail was aborted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_contract_exc_detail_recived_event1_idx` (`received_event_id`),
  KEY `fk_contract_exc_detail_contract1_idx` (`contract_id`),
  CONSTRAINT `fk_contract_exc_detail_contract1` FOREIGN KEY (`contract_id`) REFERENCES `contract` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_contract_exc_detail_recived_event1` FOREIGN KEY (`received_event_id`) REFERENCES `received_event` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contract_exc_try`
--

DROP TABLE IF EXISTS `contract_exc_try`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contract_exc_try` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `contract_exc_detail_id` int(10) unsigned NOT NULL,
  `request` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The header of the request event',
  `response` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The header of the request event',
  `state` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What satate the contract is at? (ERROR, PROCESSING, COMPLETED)',
  `finished_at` timestamp NULL DEFAULT NULL COMMENT 'When was the contract executed',
  `executed_at` timestamp NULL DEFAULT NULL COMMENT 'When was the contract executed',
  `attempts` int(11) DEFAULT '0' COMMENT 'Accumulated execution retries of contract - event',
  `is_aborted` tinyint(1) DEFAULT '0' COMMENT 'Column to know if contract_exc_try was aborted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_contract_exc_try_contract_exc_detail1_idx` (`contract_exc_detail_id`),
  CONSTRAINT `fk_contract_exc_try_contract_exc_detail1` FOREIGN KEY (`contract_exc_detail_id`) REFERENCES `contract_exc_detail` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event`
--

DROP TABLE IF EXISTS `event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `system_id` int(10) unsigned NOT NULL,
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name and the operation generated by the back end',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A name for the event',
  `operation` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What operation does the event represents (select, new,update, delete, process) ',
  `description` tinytext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A short description for the event',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idProducer_Event_UNIQUE` (`id`),
  UNIQUE KEY `identifier_UNIQUE` (`identifier`),
  KEY `fk_event_system1_idx` (`system_id`),
  CONSTRAINT `fk_event_system1` FOREIGN KEY (`system_id`) REFERENCES `system` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `received_event`
--

DROP TABLE IF EXISTS `received_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `received_event` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The id for the event',
  `event_id` int(10) unsigned NOT NULL COMMENT 'The id of the event',
  `received_request` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The header of the request event',
  `received_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When was the event recived',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_recived_event_event1_idx` (`event_id`),
  CONSTRAINT `fk_recived_event_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system`
--

DROP TABLE IF EXISTS `system`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'The Id For The Producer',
  `class` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '''The class of the system (producer or consumer)''',
  `identifier` varchar(75) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated column, lower case name',
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The name of the system',
  `type` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What type of producer it is? (Microservice, ERP, CRM, CRS, etc)',
  `description` tinytext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'A short description for the producer',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idProducer_UNIQUE` (`id`),
  UNIQUE KEY `indifier_UNIQUE` (`identifier`),
  UNIQUE KEY `client_id_UNIQUE` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `variable`
--

DROP TABLE IF EXISTS `variable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `variable` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-02-22  0:40:15

# Eventhos MySql Insert Guide

If not using an using you can use those scripts to create an eventhos flow. It is necessary to follow the established order for a correct functionality.

## 1.- Create a system

```sql
INSERT INTO `eventhos`.`system`
(`identifier`,
`name`,
`type`,
`clientId`,
`description`)
VALUES
('system_identifier',
'System Name',
'Microservice',
'clientId',
'System description');
```

## 2.- Create an event

```sql
INSERT INTO `eventhos`.`event`
(`system_id`,
`identifier`,
`name`,
`operation`,
`description`)
VALUES
(0,
'system_event',
'System Event',
'operationType',
'System event description');
```

## 3.- Create an action

```sql
INSERT INTO `eventhos`.`action`
(`system_id`,
`identifier`,
`name`,
`http_configuration`,
`operation`,
`description`)
VALUES
(0,
'system_event',
'System Event',
'{"url": "https://someUrl.com/", "method": "get", "headers": {"someHeader": "kx_HkER0R9GznN4Vf_E"}}',
'operationType',
'Action description');
```

## 4.- Create Action Security

```sql
INSERT INTO `eventhos`.`action_security`
(`action_id`,
`type`)
VALUES
(0,
'securityType');
```

## 5.- Create Contract

```sql
INSERT INTO `eventhos`.`contract`
(`action_id`,
`event_id`,
`identifier`,
`name`)
VALUES
(0,
0,
'contract_name',
'Contract Name');
```

## Test It

You need to run the eventhos api then in a postman use:

`yourBaseUrl`/event?event-identifier=system_event&access-key=asecurekey

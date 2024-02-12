
ALTER TABLE `contract_exc_detail` ADD COLUMN reply_from VARCHAR(100) NULL COMMENT 'is a column that references the event identifier was invoke';

ALTER TABLE `action` ADD COLUMN reply_to VARCHAR(100) NULL COMMENT 'is a column that references the event identifier';

ALTER TABLE contract MODIFY COLUMN mail_recipients_on_error VARCHAR(200);

alter table contract modify column name VARCHAR(200);
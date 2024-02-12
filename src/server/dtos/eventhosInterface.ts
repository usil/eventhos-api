export interface Event {
  id: number;
  system_id: number;
  identifier: string;
  name: string;
  operation: Operations;
  description: string;
  deleted: number;
  created_at: Date;
  updated_at: Date;
}

export interface Action {
  id: number;
  system_id: number;
  identifier: string;
  name: string;
  http_configuration: string;
  operation: Operations;
  description: string;
  deleted: number;
  created_at: Date;
  updated_at: Date;
  reply_to: string;
}

export interface ActionWithSystem extends Action{
  system_name: string
}


export interface Contract {
  id: number;
  order: number;
  action_id: number;
  event_id: number;
  identifier: string;
  name: string;
  active: number;
  deleted: number;
  created_at: Date;
  updated_at: Date;
  mail_recipients_on_error: string;
}

export interface ContractJoined {
  id: number;
  eventIdentifier: string;
  actionIdentifier: string;
  name: string;
  active: number;
  producerName: string;
  consumerName: string;
  mailRecipientsOnError: string;
}

export interface ActionSecurity {
  id: number;
  action_id: number;
  type: string;
  http_configuration?: string;
  json_path?: string;
  updated_at: Date;
}

export interface System {
  id: number;
  class: string;
  identifier: string;
  name: string;
  type: string;
  description: string;
  deleted: Date;
  created_at: Date;
  updated_at: Date;
  client_id: number;
}

enum Operations {
  SELECT = 'select',
  NEW = 'new',
  UPDATE = 'update',
  DELETE = 'delete',
  PROCESS = 'process',
}

import { AxiosRequestConfig } from 'axios';

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
  http_configuration: AxiosRequestConfig;
  operation: Operations;
  description: string;
  deleted: number;
  created_at: Date;
  updated_at: Date;
}

export interface Contract {
  id: number;
  action_id: number;
  event_id: number;
  identifier: string;
  name: string;
  active: number;
  deleted: number;
  created_at: Date;
  updated_at: Date;
}

export interface ActionSecurity {
  id: number;
  action_id: number;
  type: string;
  http_configuration?: AxiosRequestConfig;
  json_path_exp?: string;
  updated_at: Date;
}

enum Operations {
  SELECT = 'select',
  NEW = 'new',
  UPDATE = 'update',
  DELETE = 'delete',
  PROCESS = 'process',
}

class ProducerEvents {
  id: number;
  producer_id: number;
  identifier: string;
  name: string;
  operation: Operations;
  description: string;
  deleted: number;
  created_at: Date;
  updated_at: Date;
}

enum Operations {
  SELECT = 'select',
  NEW = 'new',
  UPDATE = 'update',
  DELETE = 'delete',
  PROCESS = 'process',
}

export default ProducerEvents;

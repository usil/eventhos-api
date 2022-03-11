class ReceivedEvent {
  id: number;
  producer_event_id: number;
  header: Record<any, any>;
  body?: Record<any, any>;
  received_at: Date;
}

export default ReceivedEvent;

class ReceivedEvent {
  id: number;
  producer_event_id: number;
  header: Record<any, any>;
  body?: Record<any, any>;
  recived_at: Date;
}

export default ReceivedEvent;

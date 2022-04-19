import { ConnectOptions } from 'stompit/lib/connect';
import stompit, { Client } from 'stompit';

class QueueHelpers {
  connect = (connectOptions: ConnectOptions): Promise<Client> => {
    return new Promise((resolve, reject) => {
      stompit.connect(connectOptions, (error, client) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(client);
      });
    });
  };
}

export default new QueueHelpers();

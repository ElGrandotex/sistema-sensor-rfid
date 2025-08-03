import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../environment';

interface RfidMessage {
  state: string;
  message: string;
  countdown?: number;
  uid_status?: string;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private stompClient: Client | null = null;
  private messageSubject = new BehaviorSubject<RfidMessage | null>(null);
  private stateHistorySubject = new BehaviorSubject<{state: string, timestamp: Date}[]>([]);
  private allMessagesSubject = new BehaviorSubject<RfidMessage[]>([]);
  private subscription?: StompSubscription;

  constructor() {
    this.initializeWebSocketConnection();
  }

  private initializeWebSocketConnection(): void {
    const serverUrl = `http://${environment.wemos.ip}:${environment.wemos.port}/ws`;

    this.stompClient = new Client({
      brokerURL: serverUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      webSocketFactory: () => new SockJS(serverUrl) as WebSocket
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Conectado al WebSocket:', frame);

      this.subscription = this.stompClient?.subscribe('/topic/alarm', (message) => {
        try {
          const msg: RfidMessage = JSON.parse(message.body);
          msg.timestamp = new Date();
          this.messageSubject.next(msg);

          const currentState = this.messageSubject.getValue()?.state;
          if (currentState !== msg.state) {
            const history = this.stateHistorySubject.getValue();
            this.stateHistorySubject.next([...history, {state: msg.state, timestamp: msg.timestamp}]);
          }

          const allMessages = this.allMessagesSubject.getValue();
          this.allMessagesSubject.next([...allMessages, msg]);
        } catch (error) {
          console.error('Error al procesar mensaje:', error);
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Error en STOMP:', frame.headers['message']);
      this.messageSubject.next(null);
    };

    this.stompClient.onWebSocketError = (error) => {
      console.error('Error en WebSocket:', error);
      this.messageSubject.next(null);
    };

    this.stompClient.onDisconnect = (frame) => {
      console.log('Desconectado:', frame);
      this.messageSubject.next(null);
    };

    this.stompClient.activate();
  }

  getMessageObservable() {
    return this.messageSubject.asObservable();
  }

  getStateHistoryObservable() {
    return this.stateHistorySubject.asObservable();
  }

  getAllMessagesObservable() {
    return this.allMessagesSubject.asObservable();
  }

  sendDeactivateCommand(): void {
    if (this.stompClient?.connected) {
      this.stompClient.publish({
        destination: '/app/deactivate',
        body: JSON.stringify({command: 'deactivate'})
      });
    } else {
      console.warn('STOMP client no está conectado');
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}

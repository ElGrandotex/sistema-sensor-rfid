import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
// Ya no necesitamos StompJs o SockJS, así que estas importaciones se eliminan.
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
  // Cambiamos el tipo de la conexión de 'Client' a 'WebSocket'
  private ws: WebSocket | null = null;
  private messageSubject = new BehaviorSubject<RfidMessage | null>(null);
  private stateHistorySubject = new BehaviorSubject<{state: string, timestamp: Date}[]>([]);
  private allMessagesSubject = new BehaviorSubject<RfidMessage[]>([]);
  // Ya no necesitamos StompSubscription
  // private subscription?: StompSubscription;

  constructor() {
    this.initializeWebSocketConnection();
  }

  private initializeWebSocketConnection(): void {
    // La URL para una conexión WebSocket debe empezar con 'ws://'
    // y debe apuntar directamente al puerto del servidor sin sub-rutas adicionales.
    const serverUrl = `ws://${environment.wemos.ip}:${environment.wemos.port}/`;

    // Nos aseguramos de que no haya una conexión existente abierta
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }

    try {
      // Creamos una instancia del objeto WebSocket nativo
      this.ws = new WebSocket(serverUrl);

      // Evento que se dispara cuando la conexión se abre exitosamente
      this.ws.onopen = (event) => {
        console.log('Conexión WebSocket establecida con éxito:', event);
        // Opcionalmente puedes emitir un mensaje o cambiar el estado de la UI
      };

      // Evento que se dispara cuando se recibe un mensaje del servidor
      this.ws.onmessage = (event) => {
        console.log('Mensaje recibido:', event.data);
        try {
          // El mensaje es una cadena de texto, la parseamos como JSON
          const msg: RfidMessage = JSON.parse(event.data);
          msg.timestamp = new Date();
          this.messageSubject.next(msg);

          // Lógica para actualizar el historial de estados
          const currentState = this.messageSubject.getValue()?.state;
          if (currentState !== msg.state) {
            const history = this.stateHistorySubject.getValue();
            this.stateHistorySubject.next([...history, {state: msg.state, timestamp: msg.timestamp}]);
          }

          // Lógica para actualizar el registro de todos los mensajes
          const allMessages = this.allMessagesSubject.getValue();
          this.allMessagesSubject.next([...allMessages, msg]);
        } catch (error) {
          console.error('Error al procesar el mensaje JSON:', error);
        }
      };

      // Evento que se dispara cuando la conexión se cierra
      this.ws.onclose = (event) => {
        console.log('Conexión WebSocket cerrada:', event);
        // Emite un estado nulo o de desconexión
        this.messageSubject.next(null);
        // Implementa la lógica de reconexión
        console.log(`Reintentando la conexión en ${environment.reconnectInterval / 1000} segundos...`);
        setTimeout(() => this.initializeWebSocketConnection(), environment.reconnectInterval);
      };

      // Evento que se dispara en caso de error en la conexión
      this.ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
        // Cierra la conexión de forma segura en caso de un error
        this.ws?.close();
      };
    } catch (e) {
      console.error('Error al intentar crear el WebSocket:', e);
      // En caso de error de conexión inicial, reintentamos
      setTimeout(() => this.initializeWebSocketConnection(), environment.reconnectInterval);
    }
  }

  // Métodos para que los componentes se suscriban a los datos
  getMessageObservable() {
    return this.messageSubject.asObservable();
  }

  getStateHistoryObservable() {
    return this.stateHistorySubject.asObservable();
  }

  getAllMessagesObservable() {
    return this.allMessagesSubject.asObservable();
  }

  // Método para enviar un comando al servidor
  sendDeactivateCommand(): void {
    // Verificamos si la conexión está abierta antes de enviar
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // El comando se envía como una cadena JSON
      this.ws.send(JSON.stringify({command: 'deactivate'}));
      console.log('Comando "deactivate" enviado.');
    } else {
      console.warn('WebSocket no está conectado. No se pudo enviar el comando.');
    }
  }

  // Implementamos el método ngOnDestroy para cerrar la conexión al destruir el servicio
  ngOnDestroy(): void {
    if (this.ws) {
      console.log('Cerrando conexión WebSocket...');
      this.ws.close();
    }
  }
}
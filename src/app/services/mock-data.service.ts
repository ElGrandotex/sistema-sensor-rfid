import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

interface MockRfidMessage {
  state: string;
  message: string;
  countdown?: number;
  uid_status?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private messageSubject = new BehaviorSubject<MockRfidMessage | null>(null);
  private stateHistorySubject = new BehaviorSubject<{state: string, timestamp: Date}[]>([]);
  private allMessagesSubject = new BehaviorSubject<MockRfidMessage[]>([]);
  
  private currentStateIndex = 0;
  private countdownValue = 10;
  private simulationSubscription?: Subscription;
  private isActive = false;

  // Secuencia de estados simulados
  private mockStates = [
    { state: 'SENSING', message: 'Sistema iniciado - Esperando tarjeta RFID', duration: 3000 },
    { state: 'SENSING', message: 'Escaneando...', duration: 2000 },
    { state: 'COUNTDOWN', message: 'Tarjeta no autorizada detectada!', countdown: 10, uid_status: 'INVALID_UID_A3B2C1', duration: 10000 },
    { state: 'ALARM', message: '¡ALARMA ACTIVADA! Acceso no autorizado', duration: 5000 },
    { state: 'SENSING', message: 'Alarma desactivada - Sistema en espera', duration: 3000 },
    { state: 'SENSING', message: 'Nueva tarjeta detectada', duration: 2000 },
    { state: 'AUTHORIZED', message: 'Acceso autorizado - Bienvenido!', uid_status: 'VALID_UID_F4E3D2', duration: 4000 },
    { state: 'SENSING', message: 'Sistema en modo vigilancia', duration: 5000 },
    { state: 'COUNTDOWN', message: 'Tarjeta desconocida', countdown: 8, uid_status: 'UNKNOWN_UID_789ABC', duration: 8000 },
    { state: 'SENSING', message: 'Countdown cancelado por usuario', duration: 3000 }
  ];

  constructor() {}

  startMockSimulation(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.currentStateIndex = 0;
    this.countdownValue = 10;
    
    // Limpiar datos anteriores
    this.stateHistorySubject.next([]);
    this.allMessagesSubject.next([]);
    
    console.log('🎮 MODO DEMO ACTIVADO - Simulando datos del sensor RFID');
    this.runNextMockState();
  }

  stopMockSimulation(): void {
    this.isActive = false;
    if (this.simulationSubscription) {
      this.simulationSubscription.unsubscribe();
    }
    this.messageSubject.next(null);
    console.log('🛑 MODO DEMO DESACTIVADO');
  }

  private runNextMockState(): void {
    if (!this.isActive) return;

    const currentMock = this.mockStates[this.currentStateIndex];
    const mockMessage: MockRfidMessage = {
      state: currentMock.state,
      message: currentMock.message,
      timestamp: new Date()
    };

    // Agregar countdown si corresponde
    if (currentMock.countdown !== undefined) {
      mockMessage.countdown = currentMock.countdown;
      this.countdownValue = currentMock.countdown;
    }

    // Agregar UID si corresponde
    if (currentMock.uid_status) {
      mockMessage.uid_status = currentMock.uid_status;
    }

    // Emitir el mensaje
    this.messageSubject.next(mockMessage);
    
    // Actualizar historial de estados
    const currentHistory = this.stateHistorySubject.getValue();
    this.stateHistorySubject.next([...currentHistory, {
      state: mockMessage.state,
      timestamp: mockMessage.timestamp
    }]);

    // Actualizar todos los mensajes
    const allMessages = this.allMessagesSubject.getValue();
    this.allMessagesSubject.next([...allMessages, mockMessage]);

    // Si tiene countdown, simular la cuenta regresiva
    if (currentMock.countdown !== undefined) {
      this.simulateCountdown(currentMock.countdown, currentMock.duration);
    } else {
      // Programar el siguiente estado
      setTimeout(() => {
        this.currentStateIndex = (this.currentStateIndex + 1) % this.mockStates.length;
        this.runNextMockState();
      }, currentMock.duration);
    }
  }

  private simulateCountdown(initialCount: number, totalDuration: number): void {
    const countdownInterval = totalDuration / initialCount;
    let currentCount = initialCount;

    const countdownSubscription = interval(countdownInterval).subscribe(() => {
      if (!this.isActive) {
        countdownSubscription.unsubscribe();
        return;
      }

      currentCount--;
      
      const currentMessage = this.messageSubject.getValue();
      if (currentMessage) {
        const updatedMessage = { ...currentMessage };
        updatedMessage.countdown = currentCount;
        updatedMessage.timestamp = new Date();
        this.messageSubject.next(updatedMessage);

        // Actualizar en todos los mensajes también
        const allMessages = this.allMessagesSubject.getValue();
        this.allMessagesSubject.next([...allMessages, updatedMessage]);
      }

      if (currentCount <= 0) {
        countdownSubscription.unsubscribe();
        // Continuar con el siguiente estado
        setTimeout(() => {
          this.currentStateIndex = (this.currentStateIndex + 1) % this.mockStates.length;
          this.runNextMockState();
        }, 500);
      }
    });
  }

  // Simular comando de desactivación
  sendMockDeactivateCommand(): void {
    if (!this.isActive) return;
    
    console.log('🔧 Comando "deactivate" simulado enviado.');
    
    // Cambiar a estado de sensing
    const deactivateMessage: MockRfidMessage = {
      state: 'SENSING',
      message: 'Alarma desactivada manualmente por el usuario',
      timestamp: new Date()
    };

    this.messageSubject.next(deactivateMessage);
    
    // Actualizar historiales
    const currentHistory = this.stateHistorySubject.getValue();
    this.stateHistorySubject.next([...currentHistory, {
      state: deactivateMessage.state,
      timestamp: deactivateMessage.timestamp
    }]);

    const allMessages = this.allMessagesSubject.getValue();
    this.allMessagesSubject.next([...allMessages, deactivateMessage]);

    // Continuar con simulación normal después de 2 segundos
    setTimeout(() => {
      this.currentStateIndex = 0; // Reiniciar secuencia
      this.runNextMockState();
    }, 2000);
  }

  // Métodos para que los componentes se suscriban (igual que el WebSocketService)
  getMessageObservable() {
    return this.messageSubject.asObservable();
  }

  getStateHistoryObservable() {
    return this.stateHistorySubject.asObservable();
  }

  getAllMessagesObservable() {
    return this.allMessagesSubject.asObservable();
  }

  isSimulationActive(): boolean {
    return this.isActive;
  }
}

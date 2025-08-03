// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { WebsocketService } from './services/websocket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DatePipe
  ]
})
export class AppComponent implements OnInit {
  currentState: any = null;
  stateHistory: any[] = [];
  allMessages: any[] = [];
  countdownProgress = 0;

  constructor(
    private websocketService: WebsocketService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.websocketService.getMessageObservable().subscribe(message => {
      this.currentState = message;
      if (message?.countdown !== undefined && message.countdown >= 0) {
        this.countdownProgress = (10 - message.countdown) * 10;
      }
    });

    this.websocketService.getStateHistoryObservable().subscribe(history => {
      this.stateHistory = history;
    });

    this.websocketService.getAllMessagesObservable().subscribe(messages => {
      this.allMessages = messages;
    });
  }

  deactivateAlarm() {
    this.websocketService.sendDeactivateCommand();
    this.snackBar.open('Comando de desactivación enviado', 'Cerrar', {
      duration: 3000
    });
  }
}

// src/app/components/sensor/sensor.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service';
import { MockDataService } from '../../services/mock-data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-sensor',
  templateUrl: './sensor.component.html',
  styleUrls: ['./sensor.component.css'],
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
    MatIconModule,
    MatBadgeModule,
    MatChipsModule,
    DatePipe
  ]
})
export class SensorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sensorChart', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stateChart', { static: false }) stateChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  currentState: any = null;
  stateHistory: any[] = [];
  allMessages: any[] = [];
  countdownProgress = 0;
  
  // Chart variables
  sensorChart: Chart | null = null;
  stateChart: Chart | null = null;
  sensorData: number[] = [];
  stateData: { [key: string]: number } = {};
  chartLabels: string[] = [];
  
  // Visual enhancements
  connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'connecting';
  lastUpdateTime: Date | null = null;
  totalEvents = 0;
  isDemoMode = false;
  
  constructor(
    private websocketService: WebsocketService,
    private mockDataService: MockDataService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    // Verificar si el modo demo está activo
    this.isDemoMode = this.mockDataService.isSimulationActive();
    
    // Seleccionar el servicio apropiado
    const dataService = this.isDemoMode ? this.mockDataService : this.websocketService;
    
    if (this.isDemoMode) {
      console.log('🎮 Componente sensor iniciado en MODO DEMO');
      this.connectionStatus = 'connected';
    }
    
    dataService.getMessageObservable().subscribe(message => {
      this.currentState = message;
      this.lastUpdateTime = new Date();
      
      if (message) {
        this.connectionStatus = 'connected';
        this.updateChartData(message);
        
        if (message?.countdown !== undefined && message.countdown >= 0) {
          this.countdownProgress = (10 - message.countdown) * 10;
        }
      } else {
        this.connectionStatus = this.isDemoMode ? 'connected' : 'disconnected';
      }
    });

    dataService.getStateHistoryObservable().subscribe(history => {
      this.stateHistory = history;
      this.updateStateChart();
    });

    dataService.getAllMessagesObservable().subscribe(messages => {
      this.allMessages = messages;
      this.totalEvents = messages.length;
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnDestroy() {
    if (this.sensorChart) {
      this.sensorChart.destroy();
    }
    if (this.stateChart) {
      this.stateChart.destroy();
    }
  }

  private initializeCharts() {
    if (this.chartCanvas) {
      this.initializeSensorChart();
    }
    if (this.stateChartCanvas) {
      this.initializeStateChart();
    }
  }

  private initializeSensorChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.sensorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartLabels,
        datasets: [{
          label: 'Actividad del Sensor',
          data: this.sensorData,
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(102, 126, 234)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#666'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#666'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#666'
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    });
  }

  private initializeStateChart() {
    const ctx = this.stateChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.stateChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(this.stateData),
        datasets: [{
          data: Object.values(this.stateData),
          backgroundColor: [
            'rgba(33, 150, 243, 0.8)', // SENSING
            'rgba(255, 152, 0, 0.8)',  // COUNTDOWN
            'rgba(244, 67, 54, 0.8)',  // ALARM
            'rgba(76, 175, 80, 0.8)'   // AUTHORIZED
          ],
          borderColor: [
            'rgb(33, 150, 243)',
            'rgb(255, 152, 0)',
            'rgb(244, 67, 54)',
            'rgb(76, 175, 80)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#666',
              padding: 20
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    });
  }

  private updateChartData(message: any) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    // Add new data point
    this.chartLabels.push(timeLabel);
    
    // Convert state to numeric value for visualization
    let value = 1;
    switch (message.state) {
      case 'SENSING': value = 1; break;
      case 'COUNTDOWN': value = 3; break;
      case 'ALARM': value = 5; break;
      case 'AUTHORIZED': value = 2; break;
      default: value = 0;
    }
    
    this.sensorData.push(value);
    
    // Keep only last 20 data points
    if (this.chartLabels.length > 20) {
      this.chartLabels.shift();
      this.sensorData.shift();
    }
    
    // Update chart if it exists
    if (this.sensorChart) {
      this.sensorChart.update('none');
    }
  }

  private updateStateChart() {
    // Count occurrences of each state
    this.stateData = {};
    this.stateHistory.forEach(item => {
      this.stateData[item.state] = (this.stateData[item.state] || 0) + 1;
    });
    
    // Update chart if it exists
    if (this.stateChart) {
      this.stateChart.data.labels = Object.keys(this.stateData);
      this.stateChart.data.datasets[0].data = Object.values(this.stateData);
      this.stateChart.update('none');
    }
  }

  deactivateAlarm() {
    if (this.isDemoMode) {
      this.mockDataService.sendMockDeactivateCommand();
      this.snackBar.open('🎮 Comando de desactivación enviado (MODO DEMO)', 'Cerrar', {
        duration: 3000,
      });
    } else {
      this.websocketService.sendDeactivateCommand();
      this.snackBar.open('Comando de desactivación enviado', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  goHome() {
    // Detener el modo demo si está activo
    if (this.isDemoMode) {
      this.mockDataService.stopMockSimulation();
      console.log('🏠 Saliendo del modo demo y regresando al home');
    }
    this.router.navigate(['/']);
  }

  stopDemo() {
    this.mockDataService.stopMockSimulation();
    this.isDemoMode = false;
    this.connectionStatus = 'connecting';
    this.snackBar.open('🛑 Modo demo desactivado', 'Cerrar', {
      duration: 2000,
    });
  }

  startDemoMode() {
    this.mockDataService.startMockSimulation();
    this.isDemoMode = true;
    this.connectionStatus = 'connected';
    this.snackBar.open('🎮 Modo demo reiniciado', 'Cerrar', {
      duration: 2000,
    });
  }

  getStateIcon(state: string): string {
    switch (state) {
      case 'SENSING': return 'sensors';
      case 'COUNTDOWN': return 'timer';
      case 'ALARM': return 'warning';
      case 'AUTHORIZED': return 'check_circle';
      default: return 'help';
    }
  }

  getConnectionIcon(): string {
    switch (this.connectionStatus) {
      case 'connected': return 'wifi';
      case 'disconnected': return 'wifi_off';
      case 'connecting': return 'wifi_find';
      default: return 'help';
    }
  }
}

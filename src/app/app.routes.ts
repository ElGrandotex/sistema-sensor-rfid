import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SensorComponent } from './components/sensor/sensor.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'sensor', component: SensorComponent },
  { path: '**', redirectTo: '' }
];

export const environment = {
  production: false,
  wemos: {
    ip: '192.168.0.234', // IP local de tu WeMos D1 Mini
    port: 81,            // Puerto del servidor WebSocket en el WeMos
    wsEndpoint: 'ws'     // Puede ser 'ws' o 'wss' para conexiones seguras
  },
  reconnectInterval: 5000, // Intervalo de reconexión en milisegundos
  maxReconnectAttempts: 10 // Número máximo de intentos de reconexión
};

export const environment = {
  production: false,
  wemos: {
    ip: '192.168.0.234', 
    port: 81, 
    wsEndpoint: '' // Cambiar 'ws' a ''
  },
  reconnectInterval: 5000, 
  maxReconnectAttempts: 10
};

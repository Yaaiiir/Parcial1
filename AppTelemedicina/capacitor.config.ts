import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'AppTelemedicina',
  webDir: 'www',
  server: {
    androidScheme: 'http', // Esto cambia el https://localhost por http://localhost
    cleartext: true        // Permite tráfico de texto plano (HTTP)
  }
};

export default config;

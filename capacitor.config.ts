import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.org.jw.altodaserra.relatoriocampo',
  appName: 'Relatório de Campo',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F2544',
      showSpinner: false
    }
  }
};

export default config;

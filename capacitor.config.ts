import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globalgates.prayforthecup',
  appName: 'Pray for the Cup',
  webDir: 'build',
  server: {
    allowNavigation: ['prayforthecup.com', '*.prayforthecup.com'],
  },
};

export default config;

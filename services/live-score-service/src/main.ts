import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';
import { LiveIoAdapter } from './live/io.adapter';

void bootstrapService(AppModule, {
  name: 'live-score-service',
  defaultPort: 4006,
  configure: (app) => {
    app.useWebSocketAdapter(new LiveIoAdapter(app));
  },
});

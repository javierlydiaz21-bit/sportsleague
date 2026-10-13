import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';

void bootstrapService(AppModule, { name: 'notification-service', defaultPort: 4008 });

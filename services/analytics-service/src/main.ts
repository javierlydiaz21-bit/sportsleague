import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';

void bootstrapService(AppModule, { name: 'analytics-service', defaultPort: 4009 });

import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';

void bootstrapService(AppModule, { name: 'auth-service', defaultPort: 4001 });

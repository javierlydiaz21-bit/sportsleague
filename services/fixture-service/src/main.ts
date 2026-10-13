import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';

void bootstrapService(AppModule, { name: 'fixture-service', defaultPort: 4004 });

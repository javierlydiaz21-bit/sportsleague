import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';

void bootstrapService(AppModule, { name: 'league-service', defaultPort: 4002 });

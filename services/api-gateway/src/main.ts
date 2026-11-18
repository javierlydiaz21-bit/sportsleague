import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './chassis';
import { GATEWAY_OPENAPI, configureGateway } from './gateway/setup';

void bootstrapService(AppModule, {
  name: 'api-gateway',
  defaultPort: 4000,
  // El cuerpo se reenvía sin parsear a cada microservicio.
  bodyParser: false,
  routeFromPath: true,
  configure: (app) => configureGateway(app),
  openapi: GATEWAY_OPENAPI,
});

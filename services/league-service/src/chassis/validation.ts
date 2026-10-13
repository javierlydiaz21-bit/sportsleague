import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

/** Nombres legibles (en español) de los campos más comunes para los mensajes de validación. */
const FIELD_LABELS: Record<string, string> = {
  name: 'nombre',
  email: 'correo',
  password: 'contraseña',
  currentPassword: 'contraseña actual',
  role: 'rol',
  status: 'estado',
  sport: 'deporte',
  description: 'descripción',
  city: 'ciudad',
  year: 'año',
  startDate: 'fecha de inicio',
  endDate: 'fecha de fin',
  minAge: 'edad mínima',
  maxAge: 'edad máxima',
  pointsWin: 'puntos por victoria',
  pointsDraw: 'puntos por empate',
  pointsLoss: 'puntos por derrota',
  tiebreakerCriteria: 'criterios de desempate',
  zone: 'zona',
  address: 'dirección',
  availableDays: 'días disponibles',
  openTime: 'hora de apertura',
  closeTime: 'hora de cierre',
  categoryId: 'categoría',
  seasonId: 'temporada',
  leagueId: 'liga',
  teamId: 'equipo',
  playerId: 'jugador',
  playerInId: 'jugador que entra',
  firstName: 'nombre',
  lastName: 'apellido',
  birthDate: 'fecha de nacimiento',
  jerseyNumber: 'número de camiseta',
  documentId: 'documento',
  position: 'posición',
  minute: 'minuto',
  type: 'tipo',
  value: 'valor',
  note: 'nota',
  reason: 'motivo',
  scheduledAt: 'fecha y hora',
  venueId: 'cancha',
  homeVenueId: 'cancha propia',
  homeTeamId: 'equipo local',
  awayTeamId: 'equipo visitante',
  matchDays: 'días de juego',
  slotMinutes: 'duración de la franja',
  minRestDays: 'descanso mínimo',
  phone: 'teléfono',
  attendance: 'asistencia',
  refereeId: 'árbitro',
  matchId: 'partido',
  players: 'jugadores',
  availability: 'disponibilidad',
  dayOfWeek: 'día',
  startTime: 'hora inicial',
  endTime: 'hora final',
  contactEmail: 'correo de contacto',
  coachName: 'entrenador',
  refreshToken: 'token de sesión',
};

const number = (original: string) => /(\d+)/.exec(original)?.[1] ?? '';

const TEMPLATES: Partial<Record<string, (field: string, original: string) => string>> = {
  isNotEmpty: (f) => `El campo "${f}" es obligatorio`,
  isDefined: (f) => `El campo "${f}" es obligatorio`,
  isString: (f) => `El campo "${f}" debe ser texto`,
  isEmail: (f) => `El campo "${f}" debe ser un correo válido`,
  minLength: (f, o) => `El campo "${f}" debe tener al menos ${number(o)} caracteres`,
  maxLength: (f, o) => `El campo "${f}" admite máximo ${number(o)} caracteres`,
  isInt: (f) => `El campo "${f}" debe ser un número entero`,
  isNumber: (f) => `El campo "${f}" debe ser un número`,
  min: (f, o) => `El campo "${f}" debe ser mayor o igual a ${number(o)}`,
  max: (f, o) => `El campo "${f}" debe ser menor o igual a ${number(o)}`,
  isEnum: (f) => `El campo "${f}" tiene un valor no permitido`,
  isIn: (f) => `El campo "${f}" tiene un valor no permitido`,
  isDateString: (f) => `El campo "${f}" debe ser una fecha válida`,
  isISO8601: (f) => `El campo "${f}" debe ser una fecha válida`,
  matches: (f) => `El campo "${f}" tiene un formato inválido`,
  isUUID: (f) => `El campo "${f}" debe ser un identificador válido`,
  isArray: (f) => `El campo "${f}" debe ser una lista`,
  arrayMinSize: (f, o) => `El campo "${f}" debe tener al menos ${number(o)} elemento(s)`,
  arrayMaxSize: (f, o) => `El campo "${f}" admite máximo ${number(o)} elementos`,
  isBoolean: (f) => `El campo "${f}" debe ser verdadero o falso`,
  isObject: (f) => `El campo "${f}" debe ser un objeto`,
  whitelistValidation: (f) => `El campo "${f}" no está permitido`,
};

function collect(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    for (const [constraint, original] of Object.entries(error.constraints ?? {})) {
      const template = TEMPLATES[constraint];
      // Los mensajes por defecto de class-validator empiezan con el nombre de la propiedad;
      // si el DTO definió un mensaje propio, se respeta.
      const isDefaultMessage = original.startsWith(`${error.property} `) || original.startsWith('property ');
      messages.push(template && isDefaultMessage ? template(FIELD_LABELS[error.property] ?? error.property, original) : original);
    }
    if (error.children?.length) messages.push(...collect(error.children));
  }
  return messages;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({ statusCode: 400, error: 'Bad Request', message: collect(errors) }),
  });
}

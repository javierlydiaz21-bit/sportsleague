import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../chassis';
import { RulesDto, UpdateCategoryDto } from './dto';
import { LeaguesService } from './leagues.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.leagues.getCategory(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.leagues.updateCategory(id, dto, user);
  }

  /** Consultado por el Statistics Service antes de recalcular la tabla de posiciones. */
  @Public()
  @Get(':id/rules')
  rules(@Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.getRules(id);
  }

  @Put(':id/rules')
  updateRules(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RulesDto, @CurrentUser() user: AuthUser) {
    return this.leagues.updateRules(id, dto, user);
  }
}

import { Injectable } from '@nestjs/common';
import { RedisService } from '../chassis';

const JOIN_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 21600)
local peak = tonumber(redis.call('GET', KEYS[2]) or '0')
if current > peak then redis.call('SET', KEYS[2], current, 'EX', 604800) end
return current`;

const LEAVE_SCRIPT = `
local current = redis.call('DECR', KEYS[1])
if current < 0 then redis.call('SET', KEYS[1], 0) current = 0 end
return current`;

/** Conteo global de espectadores por partido (compartido entre réplicas mediante Redis). */
@Injectable()
export class ViewersService {
  constructor(private readonly redis: RedisService) {}

  async join(matchId: string): Promise<number> {
    try {
      return Number(await this.redis.client.eval(JOIN_SCRIPT, 2, this.key(matchId), this.peakKey(matchId)));
    } catch {
      return 0;
    }
  }

  async leave(matchId: string): Promise<number> {
    try {
      return Number(await this.redis.client.eval(LEAVE_SCRIPT, 1, this.key(matchId)));
    } catch {
      return 0;
    }
  }

  async count(matchId: string): Promise<number> {
    try {
      return Number((await this.redis.client.get(this.key(matchId))) ?? 0);
    } catch {
      return 0;
    }
  }

  async peak(matchId: string): Promise<number> {
    try {
      return Number((await this.redis.client.get(this.peakKey(matchId))) ?? 0);
    } catch {
      return 0;
    }
  }

  private key(matchId: string): string {
    return `live:viewers:${matchId}`;
  }

  private peakKey(matchId: string): string {
    return `live:viewers-peak:${matchId}`;
  }
}

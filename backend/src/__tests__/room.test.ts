import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { redis } from '../redis.js';

// Mock the redis module
vi.mock('../redis.js', () => {
  const RedisMock = require('ioredis-mock');
  const redisMock = new RedisMock();
  return {
    redis: redisMock,
  };
});

describe('POST /room', () => {
  beforeEach(async () => {
    // Clear redis mock before each test
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should create a room and return room details', async () => {
    const response = await request(app)
      .post('/room')
      .send({ playerName: 'Alice' })
      .expect(200);

    // Assert response payload structure
    expect(response.body).toHaveProperty('roomId');
    expect(response.body).toHaveProperty('playerId');
    expect(response.body.playerName).toBe('Alice');

    const { roomId, playerId } = response.body;

    // Assert Redis state
    const roomState = await redis.hgetall(`room:${roomId}`);

    expect(roomState).toBeDefined();
    expect(roomState.currentRound).toBe('0');
    expect(roomState.totalRounds).toBe('10');
    expect(roomState.playerOneId).toBe(playerId);
    expect(roomState).toHaveProperty('lastUpdatedAt');
  });

  it('should return 400 if playerName is missing', async () => {
    const response = await request(app)
      .post('/room')
      .send({})
      .expect(400);

    expect(response.body.error).toBe('playerName is required');
  });
});

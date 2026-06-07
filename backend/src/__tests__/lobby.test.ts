import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { redis } from '../redis.js';

vi.mock('../redis.js', () => {
  const RedisMock = require('ioredis-mock');
  const redisMock = new RedisMock();
  return {
    redis: redisMock,
  };
});

describe('Lobby Endpoints', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('POST /lobby', () => {
    it('should return 400 if playerName is missing', async () => {
      const response = await request(app)
        .post('/lobby')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('playerName is required');
    });

    it('should add player to lobby and return waiting if no match found', async () => {
      const response = await request(app)
        .post('/lobby')
        .send({ playerName: 'Alice' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'waiting');
      expect(response.body).toHaveProperty('playerId');

      const { playerId } = response.body;

      const score = await redis.zscore('lobby:queue', playerId);
      expect(score).not.toBeNull();

      const name = await redis.get(`lobby:player:${playerId}`);
      expect(name).toBe('Alice');
    });

    it('should match player if someone is already in the lobby', async () => {
      // First player joins
      const res1 = await request(app)
        .post('/lobby')
        .send({ playerName: 'Alice' })
        .expect(200);

      const playerOneId = res1.body.playerId;

      // Second player joins
      const res2 = await request(app)
        .post('/lobby')
        .send({ playerName: 'Bob' })
        .expect(200);

      // Should return MATCH
      expect(res2.body).toHaveProperty('id');
      expect(res2.body.players).toHaveLength(2);
      expect(res2.body.players[0].name).toBe('Alice');
      expect(res2.body.players[1].name).toBe('Bob');

      const roomId = res2.body.id;

      // Assert Room State
      const roomState = await redis.hgetall(`room:${roomId}`);
      expect(roomState.playerOneId).toBe(playerOneId);
      expect(roomState.playerOneName).toBe('Alice');
      expect(roomState.playerTwoName).toBe('Bob');

      // Assert match notification for player 1
      const matchedRoomId = await redis.get(`lobby:match:${playerOneId}`);
      expect(matchedRoomId).toBe(roomId);
    });
  });

  describe('GET /lobby/:playerId', () => {
    it('should keep alive and return waiting if player is in queue', async () => {
      const res1 = await request(app)
        .post('/lobby')
        .send({ playerName: 'Alice' })
        .expect(200);

      const playerId = res1.body.playerId;

      const res2 = await request(app)
        .get(`/lobby/${playerId}`)
        .expect(200);

      expect(res2.body.message).toBe('waiting');
    });

    it('should return room state if player was matched', async () => {
      const res1 = await request(app)
        .post('/lobby')
        .send({ playerName: 'Alice' })
        .expect(200);
      const playerOneId = res1.body.playerId;

      await request(app)
        .post('/lobby')
        .send({ playerName: 'Bob' })
        .expect(200);

      const res3 = await request(app)
        .get(`/lobby/${playerOneId}`)
        .expect(200);

      expect(res3.body).toHaveProperty('id');
      expect(res3.body.players).toHaveLength(2);
      expect(res3.body.players[0].name).toBe('Alice');
      expect(res3.body.players[1].name).toBe('Bob');

      // Check match notification still exists (for retry support)
      const matchedRoomId = await redis.get(`lobby:match:${playerOneId}`);
      expect(matchedRoomId).not.toBeNull();
    });

    it('should return 404 if player not found', async () => {
      await request(app)
        .get('/lobby/nonexistent-id')
        .expect(404);
    });
  });
});

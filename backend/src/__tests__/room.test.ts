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
    expect(roomState.playerOneName).toBe('Alice');
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

describe('POST /room/:roomId/players', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should join an existing room and return player details', async () => {
    // First, create a room
    const createResponse = await request(app)
      .post('/room')
      .send({ playerName: 'Alice' })
      .expect(200);

    const { roomId } = createResponse.body;

    // Then, join the room
    const joinResponse = await request(app)
      .post(`/room/${roomId}/players`)
      .send({ playerName: 'Bob' })
      .expect(200);

    expect(joinResponse.body).toHaveProperty('roomId', roomId);
    expect(joinResponse.body).toHaveProperty('playerId');
    expect(joinResponse.body.playerName).toBe('Bob');
    expect(joinResponse.body.ready).toBe(true);

    const newPlayerId = joinResponse.body.playerId;

    // Assert Redis state
    const roomState = await redis.hgetall(`room:${roomId}`);
    expect(roomState.playerTwoId).toBe(newPlayerId);
    expect(roomState.playerTwoName).toBe('Bob');
  });

  it('should return 400 if playerName is missing', async () => {
    const response = await request(app)
      .post('/room/some-room-id/players')
      .send({})
      .expect(400);

    expect(response.body.error).toBe('playerName is required');
  });

  it('should return 404 if room does not exist', async () => {
    const response = await request(app)
      .post('/room/non-existent-room/players')
      .send({ playerName: 'Bob' })
      .expect(404);

    expect(response.body.error).toBe('Room not found');
  });

  it('should return 409 if room is already full', async () => {
    // Create a room
    const createResponse = await request(app)
      .post('/room')
      .send({ playerName: 'Alice' })
      .expect(200);

    const { roomId } = createResponse.body;

    // First player joins
    await request(app)
      .post(`/room/${roomId}/players`)
      .send({ playerName: 'Bob' })
      .expect(200);

    // Second player tries to join
    const fullResponse = await request(app)
      .post(`/room/${roomId}/players`)
      .send({ playerName: 'Charlie' })
      .expect(409);

    expect(fullResponse.body.error).toBe('Room is full');
  });
});

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

describe('GET /room/:roomId', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should return 404 if room does not exist', async () => {
    const response = await request(app)
      .get('/room/non-existent-room')
      .expect(404);

    expect(response.body.error).toBe('Room not found');
  });

  it('should return room state', async () => {
    // Create a room
    const createResponse = await request(app)
      .post('/room')
      .send({ playerName: 'Alice' })
      .expect(200);

    const { roomId, playerId } = createResponse.body;

    // Get room
    const getResponse = await request(app)
      .get(`/room/${roomId}`)
      .expect(200);

    expect(getResponse.body).toHaveProperty('id', roomId);
    expect(getResponse.body).toHaveProperty('currentRound', 0);
    expect(getResponse.body).toHaveProperty('totalRounds', 10);
    expect(getResponse.body.players[0]).toHaveProperty('id', playerId);
    expect(getResponse.body.players[0]).toHaveProperty('name', 'Alice');
    // Note: getResponse.body.players[1] id will be undefined as it's not set
    // supertest with expect toHaveProperty needs it to be present or we can use toEqual
    expect(getResponse.body.players[1].id).toBeUndefined();
  });

  it('should return 304 if lastUpdatedAt matches', async () => {
    // Create a room
    const createResponse = await request(app)
      .post('/room')
      .send({ playerName: 'Alice' })
      .expect(200);

    const { roomId } = createResponse.body;

    const roomState = await redis.hgetall(`room:${roomId}`);
    const lastUpdatedAt = roomState.lastUpdatedAt;

    // Get room with matching timestamp
    await request(app)
      .get(`/room/${roomId}?lastUpdatedAt=${encodeURIComponent(lastUpdatedAt)}`)
      .expect(304);
  });
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

describe('POST /room/:roomId/words', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should allow one player to submit a word and return PENDING', async () => {
    const createRes = await request(app).post('/room').send({ playerName: 'Alice' });
    const { roomId, playerId: p1Id } = createRes.body;
    const joinRes = await request(app).post(`/room/${roomId}/players`).send({ playerName: 'Bob' });
    const { playerId: p2Id } = joinRes.body;

    const res = await request(app).post(`/room/${roomId}/words`).send({
      playerId: p1Id,
      word: 'apple',
      round: 0
    }).expect(200);

    expect(res.body.currentRound).toBe(0);
    expect(res.body.currentRoundState).toBe('PENDING');
  });

  it('should return 422 if submitting for stale round', async () => {
    const createRes = await request(app).post('/room').send({ playerName: 'Alice' });
    const { roomId, playerId: p1Id } = createRes.body;
    await request(app).post(`/room/${roomId}/players`).send({ playerName: 'Bob' });

    const res = await request(app).post(`/room/${roomId}/words`).send({
      playerId: p1Id,
      word: 'apple',
      round: 1
    }).expect(422);

    expect(res.body.currentRound).toBe(0);
  });

  it('should transition to new round and PENDING if both players submit differing words', async () => {
    const createRes = await request(app).post('/room').send({ playerName: 'Alice' });
    const { roomId, playerId: p1Id } = createRes.body;
    const joinRes = await request(app).post(`/room/${roomId}/players`).send({ playerName: 'Bob' });
    const { playerId: p2Id } = joinRes.body;

    await request(app).post(`/room/${roomId}/words`).send({ playerId: p1Id, word: 'apple', round: 0 }).expect(200);
    const res = await request(app).post(`/room/${roomId}/words`).send({ playerId: p2Id, word: 'banana', round: 0 }).expect(200);

    expect(res.body.currentRound).toBe(1);
    expect(res.body.currentRoundState).toBe('PENDING');
    expect(res.body.players[0].words).toEqual(['apple']);
    expect(res.body.players[1].words).toEqual(['banana']);
  });

  it('should return MATCH if both players submit same word', async () => {
    const createRes = await request(app).post('/room').send({ playerName: 'Alice' });
    const { roomId, playerId: p1Id } = createRes.body;
    const joinRes = await request(app).post(`/room/${roomId}/players`).send({ playerName: 'Bob' });
    const { playerId: p2Id } = joinRes.body;

    await request(app).post(`/room/${roomId}/words`).send({ playerId: p1Id, word: 'apple', round: 0 }).expect(200);
    const res = await request(app).post(`/room/${roomId}/words`).send({ playerId: p2Id, word: 'apple', round: 0 }).expect(200);

    expect(res.body.currentRound).toBe(1);
    expect(res.body.currentRoundState).toBe('MATCH');
    expect(res.body.players[0].words).toEqual(['apple']);
    expect(res.body.players[1].words).toEqual(['apple']);
  });

  it('should return NO_MATCH if out of rounds', async () => {
    const createRes = await request(app).post('/room').send({ playerName: 'Alice' });
    const { roomId, playerId: p1Id } = createRes.body;
    const joinRes = await request(app).post(`/room/${roomId}/players`).send({ playerName: 'Bob' });
    const { playerId: p2Id } = joinRes.body;

    // Fast-forward to final round
    await redis.hset(`room:${roomId}`, 'currentRound', '9');

    await request(app).post(`/room/${roomId}/words`).send({ playerId: p1Id, word: 'apple', round: 9 }).expect(200);
    const res = await request(app).post(`/room/${roomId}/words`).send({ playerId: p2Id, word: 'banana', round: 9 }).expect(200);

    expect(res.body.currentRound).toBe(10);
    expect(res.body.currentRoundState).toBe('NO_MATCH');
    expect(res.body.players[0].words).toHaveLength(10);
  });
});

import request from 'supertest';
import server from '../src/app';

afterAll((done) => {
  server.close(done);
});

describe('GET /', () => {
  it('should return 200 OK and serve index.html', async () => {
    const response = await request(server).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain(`<div>\n            Hello!\n        </div>`);
  });
});

describe('GET /chat.html', () => {
  it('should return 200 OK and serve chat.html', async () => {
    const response = await request(server).get('/chat.html');
    expect(response.status).toBe(200);
    expect(response.text).toContain(`<div>\n            Chat\n        </div>`);
  });
});

describe('GET /404.html', () => {
  it('should return 200 OK and serve 404.html', async () => {
    const response = await request(server).get('/404.html');
    expect(response.status).toBe(200);
    expect(response.text).toContain(`<div>\n            Error\n        </div>`);
  });
});

describe('GET /nonexistent.html', () => {
  it('should return 404 Not Found for nonexistent file', async () => {
    const response = await request(server).get('/nonexistent.html');
    expect(response.status).toBe(404);
    expect(response.text).toContain(`<div>\n            Error\n        </div>`);
  });
});

describe('GET /sha.json', () => {
  it('should return 200 OK and serve sha.json', async () => {
    const response = await request(server).get('/sha.json');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sha: '07f4ef2a86fd9f3bb40e812ea42bcb945eecfd8d' });
  });
});

describe('GET /symbol.svg', () => {
  it('should return 200 OK and serve symbol.svg', async () => {
    const response = await request(server).get('/symbol.svg');
    expect(response.headers['content-type']).toBe('image/svg+xml');
    expect(response.body.toString()).toContain('<svg xmlns="http://www.w3.org/2000/svg"');

  });
});
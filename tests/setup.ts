// Test environment setup
(process.env as Record<string, string | undefined>)['NODE_ENV'] = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/memora_test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-needed-for-safety';
process.env.AI_PROVIDER = 'mock';

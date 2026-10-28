import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, FluxFeedDatabase, createStorageService as createDatabaseStorage } from '@/lib/db';
import { createAiCompletionClient } from '@/lib/ai/ai-client';
import { AiRequestError } from '@/lib/ai/ai-errors';
import { createAiModule, type AiRequest } from '@/lib/ai/ai-module';
import { ARTICLE_MAX_CHARACTERS } from '@/lib/ai/article-chunker';

/** Provides observable storage for AI module behavior tests. */
function createStorageService() {
  return {
    saveFeed: vi.fn(),
    removeFeed: vi.fn(),
    getFeed: vi.fn(),
    getFeeds: vi.fn(),
    getGroups: vi.fn(),
    saveGroup: vi.fn(),
    removeGroup: vi.fn(),
    moveTreeNode: vi.fn(),
    getUnreadCount: vi.fn().mockResolvedValue(3),
    getSettings: vi.fn(),
    saveArticles: vi.fn(),
    bulkUpdateArticles: vi.fn(),
    getArticles: vi.fn(),
    updateArticle: vi.fn(),
    saveSettings: vi.fn(),
    getArticle: vi.fn(),
    getDailyDigest: vi.fn(),
    saveDailyDigest: vi.fn(),
  };
}

/** Exercises the public interface with injected storage and model adapters. */
function execute(
  request: AiRequest,
  dependencies: Partial<Parameters<typeof createAiModule>[0]>
    & Pick<Parameters<typeof createAiModule>[0], 'storageService'>,
) {
  return createAiModule({
    aiSecretStorage: {
      hasApiKey: vi.fn(),
      getApiKey: vi.fn().mockResolvedValue(''),
      setApiKey: vi.fn(),
      clearApiKey: vi.fn(),
    },
    createAiClient: () => ({ complete: vi.fn() }),
    ...dependencies,
  }).execute(request);
}

describe('AI module operations', () => {
  it('generates and saves a manual article summary through injected AI dependencies', async () => {
    const storageService = createStorageService();
    storageService.getArticle.mockResolvedValue({
      id: 'a1',
      title: 'Article',
      author: 'Author',
    });
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
      },
    });
    const complete = vi.fn().mockResolvedValue('{"overview":"Summary","keyPoints":["Point"]}');

    const response = await execute(
      {
        action: 'ARTICLE_SUMMARIZE',
        payload: {
          articleId: 'a1',
          contentText: 'A'.repeat(100),
          trigger: 'manual',
        },
      },
      {
        storageService,

        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn().mockResolvedValue('key'),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient: vi.fn(() => ({ complete })),
        now: () => 100,
      },
    );

    expect(response.success).toBe(true);
    expect(storageService.updateArticle).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        aiSummary: expect.objectContaining({ overview: 'Summary', model: 'reader-model' }),
      }),
    );
  });
  it('enforces the automatic summary character threshold in the background', async () => {
    const storageService = createStorageService();
    storageService.getArticle.mockResolvedValue({ id: 'a1', title: 'Article' });
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
        autoSummarizeOnOpen: true,
        autoSummarizeMinCharacters: 500,
      },
    });
    const createAiClient = vi.fn();

    const response = await execute(
      {
        action: 'ARTICLE_SUMMARIZE',
        payload: {
          articleId: 'a1',
          contentText: 'A'.repeat(100),
          trigger: 'auto',
        },
      },
      {
        storageService,

        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn(),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient,
      },
    );

    expect(response).toEqual({ success: false, error: 'AI_AUTO_SUMMARY_BELOW_THRESHOLD' });
    expect(createAiClient).not.toHaveBeenCalled();
  });
  it('reads a cached daily digest and rejects an invalid day range', async () => {
    const storageService = createStorageService();
    const digest = { id: '2026-07-28:Asia%2FShanghai:all', overview: 'Overview' };
    storageService.getDailyDigest.mockResolvedValue(digest);
    const dependencies = {
      storageService,

    };
    const validPayload = {
      dayKey: '2026-07-28',
      timeZone: 'Asia/Shanghai',
      scope: 'all' as const,
      startAt: 1000,
      endAt: 2000,
    };

    const valid = await execute(
      { action: 'DAILY_DIGEST_GET', payload: validPayload },
      dependencies,
    );
    const invalid = await execute(
      {
        action: 'DAILY_DIGEST_GET',
        payload: { ...validPayload, dayKey: '07/28/2026', endAt: validPayload.startAt },
      },
      dependencies,
    );

    expect(valid).toEqual({ success: true, data: { digest } });
    expect(storageService.getDailyDigest).toHaveBeenCalledWith(
      '2026-07-28:Asia%2FShanghai:all',
    );
    expect(invalid).toEqual({ success: false, error: 'DAILY_DIGEST_INVALID_DATE' });
  });
  it('generates and saves a daily digest through injected AI dependencies', async () => {
    const storageService = createStorageService();
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
      },
    });
    storageService.getArticles.mockResolvedValue([{
      id: 'a1',
      feedId: 'feed-1',
      title: 'Article',
      author: 'Author',
      publishedAt: 1500,
      summary: 'Fallback summary',
      isRead: false,
    }]);
    storageService.getFeeds.mockResolvedValue([{ id: 'feed-1', title: 'Feed' }]);
    storageService.getDailyDigest.mockResolvedValue(undefined);
    const complete = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({
        entries: [{
          articleId: 'a1',
          brief: 'Generated brief',
          whyItMatters: 'Useful',
          topics: ['AI'],
        }],
        topicHints: ['AI'],
      }))
      .mockResolvedValueOnce(JSON.stringify({
        overview: 'Today overview',
        topics: [{ name: 'AI', overview: 'AI news', articleIds: ['a1'] }],
      }));

    const response = await execute(
      {
        action: 'DAILY_DIGEST_GENERATE',
        payload: {
          dayKey: '2026-07-28',
          timeZone: 'Asia/Shanghai',
          scope: 'all',
          startAt: 1000,
          endAt: 2000,
          articleExcerpts: [{ articleId: 'a1', textExcerpt: 'Article body' }],
        },
      },
      {
        storageService,

        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn().mockResolvedValue('key'),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient: vi.fn(() => ({ complete })),
        now: () => 3000,
      },
    );

    expect(response.success).toBe(true);
    expect(storageService.saveDailyDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '2026-07-28:Asia%2FShanghai:all',
        overview: 'Today overview',
        articleIds: ['a1'],
      }),
    );
  });
  it('updates AI credentials without returning the secret', async () => {
    const storageService = createStorageService();
    const aiSecretStorage = {
      hasApiKey: vi.fn().mockResolvedValue(true),
      getApiKey: vi.fn(),
      setApiKey: vi.fn(),
      clearApiKey: vi.fn(),
    };
    const dependencies = {
      storageService,

      aiSecretStorage,
    };

    const update = await execute(
      { action: 'AI_CREDENTIAL_UPDATE', payload: { apiKey: 'private-key' } },
      dependencies,
    );
    const status = await execute(
      { action: 'AI_CREDENTIAL_STATUS' },
      dependencies,
    );

    expect(aiSecretStorage.setApiKey).toHaveBeenCalledWith('private-key', 'openai-compatible');
    expect(update).toEqual({ success: true, data: { hasApiKey: true } });
    expect(status).toEqual({ success: true, data: { hasApiKey: true } });
    expect(JSON.stringify([update, status])).not.toContain('private-key');
  });
  it('rejects oversized AI credentials', async () => {
    const storageService = createStorageService();
    const setApiKey = vi.fn();

    const response = await execute(
      { action: 'AI_CREDENTIAL_UPDATE', payload: { apiKey: 'x'.repeat(10001) } },
      {
        storageService,

        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn(),
          setApiKey,
          clearApiKey: vi.fn(),
        },
      },
    );

    expect(response).toEqual({ success: false, error: 'AI_REQUEST_INVALID' });
    expect(setApiKey).not.toHaveBeenCalled();
  });
  it('maps AI connection failures to their public error code', async () => {
    const storageService = createStorageService();
    storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: {
        ...DEFAULT_SETTINGS.ai,
        apiUrl: 'https://ai.example/chat',
        model: 'reader-model',
      },
    });

    const response = await execute(
      { action: 'AI_CONNECTION_TEST' },
      {
        storageService,

        aiSecretStorage: {
          hasApiKey: vi.fn(),
          getApiKey: vi.fn().mockResolvedValue('key'),
          setApiKey: vi.fn(),
          clearApiKey: vi.fn(),
        },
        createAiClient: vi.fn(() => ({
          complete: vi.fn().mockRejectedValue(new AiRequestError('AI_TIMEOUT')),
        })),
      },
    );

    expect(response).toEqual({ success: false, error: 'AI_TIMEOUT' });
  });

});

/** Supplies the AI module with observable storage and deterministic AI responses. */
function summaryDependencies() {
  const storageService = createStorageService();
  const oldSummary = { overview: 'Old summary' };
  storageService.getArticle.mockResolvedValue({
    id: 'a1', title: 'Article', author: '', aiSummary: oldSummary,
  });
  storageService.getSettings.mockResolvedValue({
    ...DEFAULT_SETTINGS,
    ai: {
      ...DEFAULT_SETTINGS.ai,
      apiUrl: 'https://example.com/v1', model: 'model', autoSummarizeOnOpen: true,
    },
  });
  const complete = vi.fn().mockResolvedValue('{"overview":"New summary","keyPoints":[]}');
  return {
    storageService,
    complete,
    aiSecretStorage: {
      hasApiKey: vi.fn(), getApiKey: vi.fn().mockResolvedValue(''),
      setApiKey: vi.fn(), clearApiKey: vi.fn(),
    },
    createAiClient: vi.fn(() => ({ complete })),
  };
}

describe('background long article summaries', () => {
  it.each([
    { trigger: 'manual', allowPartial: false },
    { trigger: 'auto', allowPartial: true },
  ])('rejects partial processing without manual consent: $trigger', async (options) => {
    const dependencies = summaryDependencies();
    const response = await execute({
      action: 'ARTICLE_SUMMARIZE',
      payload: { articleId: 'a1', contentText: 'A'.repeat(ARTICLE_MAX_CHARACTERS + 1), ...options },
    }, dependencies);
    expect(response).toEqual({ success: false, error: 'AI_PARTIAL_CONFIRMATION_REQUIRED' });
    expect(dependencies.createAiClient).not.toHaveBeenCalled();
    expect(dependencies.storageService.updateArticle).not.toHaveBeenCalled();
  });

  it('summarizes more than 30,000 characters and saves only after synthesis', async () => {
    const dependencies = summaryDependencies();
    const response = await execute({
      action: 'ARTICLE_SUMMARIZE',
      payload: { articleId: 'a1', contentText: 'A'.repeat(31000), trigger: 'manual' },
    }, dependencies);
    expect(response.success).toBe(true);
    expect(dependencies.complete).toHaveBeenCalledTimes(3);
    expect(dependencies.storageService.updateArticle).toHaveBeenCalledOnce();
    expect(dependencies.storageService.updateArticle).toHaveBeenCalledWith('a1', {
      aiSummary: expect.objectContaining({ isPartial: false, chunkCount: 2 }),
    });
  });

  it('saves explicit partial scope with at most six requests', async () => {
    const dependencies = summaryDependencies();
    const response = await execute({
      action: 'ARTICLE_SUMMARIZE',
      payload: {
        articleId: 'a1', contentText: 'A'.repeat(ARTICLE_MAX_CHARACTERS + 1),
        trigger: 'manual', allowPartial: true,
      },
    }, dependencies);
    expect(response.success).toBe(true);
    expect(dependencies.complete).toHaveBeenCalledTimes(6);
    expect(dependencies.storageService.updateArticle).toHaveBeenCalledWith('a1', {
      aiSummary: expect.objectContaining({ isPartial: true, chunkCount: 5 }),
    });
  });

  it.each(['chunk', 'synthesis'])('preserves old cache when %s fails', async (phase) => {
    const dependencies = summaryDependencies();
    if (phase === 'chunk') {
      dependencies.complete.mockRejectedValueOnce(new AiRequestError('AI_TIMEOUT'));
    } else {
      dependencies.complete
        .mockResolvedValueOnce('{"overview":"Section one","keyPoints":[]}')
        .mockResolvedValueOnce('{"overview":"Section two","keyPoints":[]}')
        .mockRejectedValueOnce(new AiRequestError('AI_TIMEOUT'));
    }
    const response = await execute({
      action: 'ARTICLE_SUMMARIZE',
      payload: { articleId: 'a1', contentText: 'A'.repeat(31000), trigger: 'manual', force: true },
    }, dependencies);
    expect(response).toEqual({ success: false, error: 'AI_TIMEOUT' });
    expect(dependencies.storageService.updateArticle).not.toHaveBeenCalled();
  });
});

describe('AI provider credential routing', () => {
  it.each(['google', 'anthropic'] as const)('loads only the selected %s credential', async (provider) => {
    const dependencies = summaryDependencies();
    dependencies.storageService.getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, provider, apiUrl: '', model: 'native-model' },
    });
    dependencies.aiSecretStorage.getApiKey.mockResolvedValue('scoped-test-key');
    const result = await execute({ action: 'AI_CONNECTION_TEST' }, dependencies);
    expect(result.success).toBe(true);
    expect(dependencies.aiSecretStorage.getApiKey).toHaveBeenCalledExactlyOnceWith(provider);
    expect(dependencies.createAiClient).toHaveBeenCalledWith(
      expect.objectContaining({ provider }), 'scoped-test-key',
    );

    await execute({
      action: 'AI_CREDENTIAL_UPDATE', payload: { provider, apiKey: 'new-scoped-key' },
    }, dependencies);
    expect(dependencies.aiSecretStorage.setApiKey).toHaveBeenCalledWith('new-scoped-key', provider);
    expect(dependencies.aiSecretStorage.hasApiKey).toHaveBeenCalledWith(provider);
  });
});

describe('AI module input and error containment', () => {
  it.each([
    { action: 'ARTICLE_SUMMARIZE', payload: null, error: 'AI_REQUEST_INVALID' },
    { action: 'ARTICLE_SUMMARIZE', payload: { articleId: 1 }, error: 'AI_REQUEST_INVALID' },
    { action: 'DAILY_DIGEST_GET', payload: undefined, error: 'DAILY_DIGEST_INVALID_DATE' },
    { action: 'DAILY_DIGEST_GENERATE', payload: [], error: 'DAILY_DIGEST_INVALID_DATE' },
    { action: 'AI_CREDENTIAL_UPDATE', payload: { apiKey: 42 }, error: 'AI_REQUEST_INVALID' },
  ] as const)('rejects malformed $action inputs before I/O', async ({ action, payload, error }) => {
    const storageService = createStorageService();
    const result = await execute({ action, payload }, { storageService });
    expect(result).toEqual({ success: false, error });
    expect(storageService.getSettings).not.toHaveBeenCalled();
    expect(storageService.getArticle).not.toHaveBeenCalled();
    expect(storageService.updateArticle).not.toHaveBeenCalled();
  });

  it('redacts unexpected storage failures at the public seam', async () => {
    const storageService = createStorageService();
    storageService.getSettings.mockRejectedValue(new Error('private diagnostic text'));
    expect(await execute({ action: 'AI_CONNECTION_TEST' }, { storageService }))
      .toEqual({ success: false, error: 'AI_REQUEST_FAILED' });
  });
});

describe('AI module with SDK and IndexedDB adapters', () => {
  const database = new FluxFeedDatabase();

  afterEach(async () => {
    await database.delete();
  });

  it('persists a summary, reuses its cache, and preserves it after a remote failure', async () => {
    const storageService = createDatabaseStorage(database);
    await storageService.saveSettings({
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, apiUrl: 'https://example.com/v1', model: 'model' },
    });
    await storageService.saveArticles([{
      id: 'a1',
      feedId: 'f1',
      guid: 'a1',
      title: 'Article',
      url: 'https://example.com/article',
      author: '',
      summary: '',
      content: '',
      publishedAt: 1,
      fetchedAt: 1,
      isRead: false,
      isStarred: false,
      tags: [],
    }]);
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"overview":"Saved result","keyPoints":[]}' } }],
    })));
    const module = createAiModule({
      storageService,
      aiSecretStorage: {
        hasApiKey: async () => true,
        getApiKey: async () => 'test-api-key',
        setApiKey: vi.fn(),
        clearApiKey: vi.fn(),
      },
      createAiClient: (settings, apiKey) => createAiCompletionClient({
        provider: settings.provider,
        apiUrl: settings.apiUrl,
        model: settings.model,
        apiKey,
        fetchImpl,
      }),
    });
    const request: AiRequest = {
      action: 'ARTICLE_SUMMARIZE',
      payload: { articleId: 'a1', contentText: 'A'.repeat(100), trigger: 'manual' },
    };
    const generated = await module.execute(request);
    const cached = await module.execute(request);
    expect(generated.success).toBe(true);
    expect(cached).toMatchObject({ success: true, data: { cached: true } });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const saved = (await storageService.getArticle('a1'))?.aiSummary;
    expect(saved?.overview).toBe('Saved result');

    fetchImpl.mockImplementation(async () => new Response('private provider diagnostics', { status: 401 }));
    const failed = await module.execute({
      action: 'ARTICLE_SUMMARIZE',
      payload: { articleId: 'a1', contentText: 'A'.repeat(100), trigger: 'manual', force: true },
    });
    expect(failed).toEqual({ success: false, error: 'AI_AUTH_FAILED' });
    expect((await storageService.getArticle('a1'))?.aiSummary).toEqual(saved);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.stringify([generated, cached, failed])).not.toContain('test-api-key');
  });
});

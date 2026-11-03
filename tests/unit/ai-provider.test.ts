import { describe, it, expect } from 'vitest';
import { MockAiProvider } from '@/server/ai/provider';

describe('Unit: AI Provider Adapter', () => {
  const provider = new MockAiProvider();

  it('generates a concise title from note content without external dependencies', async () => {
    const content = '# Quarterly Product Roadmap\nDiscuss Q3 goals and milestones.';
    const res = await provider.generateTitle(content, 'Untitled');
    expect(res.title).toContain('Quarterly Product Roadmap');
  });

  it('generates a concise summary preserving important information', async () => {
    const content =
      'We met with the client to discuss the integration. The API rate limits need to be verified. The decision was made to launch the beta next month.';
    const res = await provider.generateSummary(content, 1);
    expect(res.summary).toBeDefined();
    expect(res.keyPoints.length).toBeGreaterThan(0);
    expect(res.sourceVersion).toBe(1);
  });

  it('extracts action items, assignees, deadlines and source excerpts accurately', async () => {
    const content =
      'Review the API documentation. Ask Priya to verify the permission rules. Submit the report by Friday.';
    const res = await provider.extractActions(content, 2);

    expect(res.items.length).toBeGreaterThanOrEqual(2);

    // Look for Priya
    const priyaAction = res.items.find((item) => item.assigneeName === 'Priya');
    expect(priyaAction).toBeDefined();
    expect(priyaAction?.sourceExcerpt).toContain('Priya');

    // Look for Friday
    const fridayAction = res.items.find((item) => item.dueDateText && item.dueDateText.includes('Friday'));
    expect(fridayAction).toBeDefined();
  });
});


#!/usr/bin/env bun
/**
 * Build the custom Bun template for E2B
 *
 * Requires: E2B_API_KEY environment variable
 * Run with: bun run build-template
 */

import { Template, defaultBuildLogger } from 'e2b';
import { template } from './template';

const TEMPLATE_ALIAS = 'supertools-bun';

async function main() {
  console.log('Building E2B template with Bun runtime...');
  console.log('This may take a few minutes.\n');

  const result = await Template.build(template, {
    alias: TEMPLATE_ALIAS,
    onBuildLogs: defaultBuildLogger(),
  });

  console.log('\nTemplate built successfully!');
  console.log(`Template ID: ${result.templateId}`);
  console.log(`Alias: ${TEMPLATE_ALIAS}`);
}

main().catch((error) => {
  console.error('Build failed:', error.message);
  process.exit(1);
});

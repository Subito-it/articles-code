import fs from 'node:fs';
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

interface Result {
  description: string;
  help: string;
  helpUrl: string;
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  nodes: unknown;
}

export const generateAxeReport = async (
  name: string,
  page: Page,
  isMobile: boolean,
  includeSelector?: string
) => {
  let axe = getAxeInstance(page);

  if (includeSelector) {
    axe = axe.include(includeSelector);
  }

  const results = await axe.analyze();
  const violations = results.violations;

  await saveAccessibilityResults(name, violations, isMobile);

  return violations;
};

const getAxeInstance = (page: Page) => {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast'])
    .exclude('[class*="lira-container"]')
    .exclude('[id^="google_ads_iframe_"]')
    .exclude('#skinadvtop2')
    .exclude('#skinadvtop2')
    .exclude('#subito_skin_id');
};

async function saveAccessibilityResults(
  fileName: string,
  violations: Array<Result>,
  isMobile: boolean
) {
  const outputDir = 'test/a11y/output';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true }); // Create directory if it doesn't exist
  }

  const filePath = path.join(
    outputDir,
    `${fileName}-${isMobile ? 'mobile' : 'desktop'}.json`
  );

  // Escape strings before writing to the file
  const escapedViolations = violations.map((violation) => {
    return {
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes,
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(escapedViolations, null, 2));
  console.log(`Accessibility results saved to ${filePath}`);
}

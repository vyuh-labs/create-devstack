import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig, GenerationResult, ConflictStrategy } from '../types';
import { buildVariables, buildConditions } from '../template-engine';
import { processTemplate } from '@vyuhlabs/dxkit';
import { writeFile } from '../files';

/** Resolve the templates directory (bundled with the package). */
function templatesDir(): string {
  return path.resolve(__dirname, '..', '..', 'templates', 'devcontainer');
}

/** Read and process a template file. */
function renderFile(
  templateName: string,
  vars: Record<string, string>,
  conds: Record<string, boolean>,
): string {
  const filePath = path.join(templatesDir(), templateName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return processTemplate(raw, vars, conds);
}

/** Generate .devcontainer/ directory from templates. */
export function generateDevcontainer(
  targetDir: string,
  config: ProjectConfig,
  strategy: ConflictStrategy = 'skip',
): GenerationResult[] {
  const vars = buildVariables(config);
  const conds = buildConditions(config);
  const results: GenerationResult[] = [];

  // Core devcontainer files
  const files: Array<{ template: string; output: string; executable?: boolean }> = [
    { template: 'Dockerfile.dev.template', output: '.devcontainer/Dockerfile.dev' },
    { template: 'docker-compose.yml.template', output: '.devcontainer/docker-compose.yml' },
    { template: 'devcontainer.json.template', output: '.devcontainer/devcontainer.json' },
    {
      template: 'post-create.sh.template',
      output: '.devcontainer/post-create.sh',
      executable: true,
    },
  ];

  for (const file of files) {
    const content = renderFile(file.template, vars, conds);
    results.push(writeFile(targetDir, file.output, content, strategy, file.executable));
  }

  // Conditionally generate init-scripts for PostgreSQL
  if (config.infrastructure.postgres?.enabled) {
    const sqlContent = renderFile('init-scripts/01-init.sql.template', vars, conds);
    results.push(
      writeFile(targetDir, '.devcontainer/init-scripts/01-init.sql', sqlContent, strategy),
    );
  }

  return results;
}

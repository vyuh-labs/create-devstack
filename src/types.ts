/** Language configuration in .project.yaml */
export interface LanguageConfig {
  enabled: boolean;
  version: string;
  src_dir?: string;
  directory?: string;
  quality?: QualityConfig;
  features?: Record<string, boolean>;
}

/** Quality settings per language */
export interface QualityConfig {
  coverage: number;
  lint: boolean;
  typecheck?: boolean;
  format?: boolean;
}

/** Infrastructure service configuration */
export interface InfraConfig {
  enabled: boolean;
  version: string;
}

/** Tools configuration */
export interface ToolsConfig {
  claude_code: boolean;
  github_cli: boolean;
  docker: boolean;
  precommit: boolean;
  gcloud: boolean;
  pulumi: boolean;
  infisical: boolean;
}

/** Full .project.yaml schema */
export interface ProjectConfig {
  project: {
    name: string;
    description: string;
  };
  languages: {
    python?: LanguageConfig;
    go?: LanguageConfig;
    node?: LanguageConfig;
    nextjs?: LanguageConfig;
    rust?: LanguageConfig;
    csharp?: LanguageConfig;
  };
  infrastructure: {
    postgres?: InfraConfig;
    redis?: InfraConfig;
  };
  tools: ToolsConfig;
}

/** Quality preset levels */
export type QualityPreset = 'strict' | 'standard' | 'relaxed' | 'custom';

/** File write strategy for brownfield */
export type ConflictStrategy = 'skip' | 'ask' | 'overwrite';

/** Result of writing a single file */
export type WriteResult = 'created' | 'skipped' | 'overwritten';

/** Result entry for generation report */
export interface GenerationResult {
  path: string;
  result: WriteResult;
}
